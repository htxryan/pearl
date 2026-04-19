import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, normalize, relative, resolve, sep } from "node:path";
import Busboy from "@fastify/busboy";
import type { LocalScope, Ref, Settings } from "@pearl/shared";
import { createRef } from "@pearl/shared";
import type { FastifyInstance } from "fastify";
import { findBeadsDir } from "../config.js";
import { loadSettings, type SettingsLogger } from "../settings-loader.js";
import type { SettingsEventBus } from "./settings.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIMES = new Set(["image/webp", "image/png", "image/jpeg", "image/gif", "image/avif"]);

const MIME_TO_EXT: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/avif": "avif",
};

function containsTraversal(p: string): boolean {
  return p.split(/[/\\]/).includes("..");
}

function computeSha256(bytes: Buffer): { sha256Full: string; ref: Ref } {
  const hash = createHash("sha256").update(bytes).digest("hex");
  return { sha256Full: hash, ref: createRef(hash.slice(0, 12)) };
}

function resolveAttachmentDir(scope: LocalScope, projectRoot: string, settings: Settings): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  if (scope === "project") {
    const base =
      settings.attachments.local.projectPathOverride ??
      resolve(projectRoot, ".pearl", "attachments");
    return resolve(base, yyyy, mm);
  }

  const projectId = basename(projectRoot);
  const base =
    settings.attachments.local.userPathOverride ??
    resolve(homedir(), ".pearl", "attachments", projectId);
  return resolve(base, yyyy, mm);
}

async function atomicWrite(filePath: string, data: Buffer): Promise<void> {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });

  const suffix = `${process.pid}.${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const tmpPath = `${filePath}.${suffix}.tmp`;
  await writeFile(tmpPath, data, { flush: true });
  await rename(tmpPath, filePath);
}

interface ParsedMultipart {
  fileBuffer: Buffer;
}

function parseMultipart(
  req: import("node:http").IncomingMessage,
  limit: number,
): Promise<ParsedMultipart> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: req.headers as import("@fastify/busboy").BusboyHeaders,
      limits: { fileSize: limit, files: 1 },
    });

    let fileBuffer: Buffer | null = null;
    let fileTruncated = false;

    bb.on("file", (_fieldname: string, stream: NodeJS.ReadableStream, _info: unknown) => {
      const chunks: Buffer[] = [];
      (stream as import("node:stream").Readable).on("data", (chunk: Buffer) => chunks.push(chunk));
      (stream as import("node:stream").Readable).on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
      (stream as import("node:stream").Readable).on("limit", () => {
        fileTruncated = true;
      });
    });

    bb.on("close", () => {
      if (fileTruncated) {
        reject(new Error("FILE_TOO_LARGE"));
        return;
      }
      if (!fileBuffer) {
        reject(new Error("NO_FILE"));
        return;
      }
      resolve({ fileBuffer });
    });

    bb.on("error", reject);
    req.pipe(bb);
  });
}

export function registerAttachmentRoutes(
  app: FastifyInstance,
  settingsEventBus: SettingsEventBus,
): void {
  app.register(async (plugin) => {
    const beadsDir = findBeadsDir(process.cwd());
    const projectRoot = beadsDir ? dirname(beadsDir) : process.cwd();

    let cachedSettings: Settings | null = null;
    settingsEventBus.on((s) => {
      cachedSettings = s;
    });

    const logger: SettingsLogger = {
      warn(msg: string) {
        plugin.log.warn(msg);
      },
    };

    async function getSettings(): Promise<Settings> {
      if (cachedSettings) return cachedSettings;
      cachedSettings = await loadSettings(projectRoot, logger);
      return cachedSettings;
    }

    plugin.addContentTypeParser(
      "multipart/form-data",
      (_req: unknown, _payload: unknown, done: (err: null) => void) => {
        done(null);
      },
    );

    plugin.post("/api/attachments", async (request, reply) => {
      let parsed: ParsedMultipart;
      try {
        parsed = await parseMultipart(request.raw, MAX_FILE_SIZE);
      } catch (err) {
        const message = (err as Error).message;
        if (message === "FILE_TOO_LARGE") {
          return reply.code(413).send({
            code: "TOO_LARGE",
            limit: MAX_FILE_SIZE,
            message: `File exceeds maximum size of ${MAX_FILE_SIZE} bytes`,
            retryable: false,
          });
        }
        if (message === "NO_FILE") {
          return reply.code(400).send({
            code: "VALIDATION_ERROR",
            message: "No file uploaded",
            retryable: false,
          });
        }
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Failed to parse multipart body",
          retryable: false,
        });
      }

      const { fileBuffer } = parsed;
      const settings = await getSettings();

      if (fileBuffer.byteLength > settings.attachments.encoding.maxBytes) {
        return reply.code(413).send({
          code: "TOO_LARGE",
          limit: settings.attachments.encoding.maxBytes,
          message: `File exceeds configured maxBytes limit of ${settings.attachments.encoding.maxBytes}`,
          retryable: false,
        });
      }

      // Magic-byte MIME sniff — never trust client-declared MIME (X6, UCA-13)
      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(fileBuffer);
      const sniffedMime = detected?.mime ?? "application/octet-stream";

      if (!ALLOWED_MIMES.has(sniffedMime)) {
        return reply.code(415).send({
          code: "MIME_MISMATCH",
          sniffed: sniffedMime,
          message: `Detected MIME type "${sniffedMime}" is not a supported image format`,
          retryable: false,
        });
      }

      // Server-side ref computation (E3a)
      const { sha256Full, ref } = computeSha256(fileBuffer);
      const ext = MIME_TO_EXT[sniffedMime] || "bin";
      const scope = settings.attachments.local.scope;

      const attachmentDir = resolveAttachmentDir(scope, projectRoot, settings);
      const filePath = resolve(attachmentDir, `${ref}.${ext}`);

      // Path-traversal guard (X2)
      const normalizedPath = normalize(filePath);
      const projectId = basename(projectRoot);
      const normalizedDir = normalize(
        scope === "project"
          ? (settings.attachments.local.projectPathOverride ??
              resolve(projectRoot, ".pearl", "attachments"))
          : (settings.attachments.local.userPathOverride ??
              resolve(homedir(), ".pearl", "attachments", projectId)),
      );
      if (!normalizedPath.startsWith(normalizedDir + sep) || containsTraversal(filePath)) {
        return reply.code(422).send({
          code: "PATH_TRAVERSAL",
          message: "Resolved path escapes the attachment directory",
          retryable: false,
        });
      }

      const relPath = relative(projectRoot, filePath);

      // Content-addressed dedup
      if (existsSync(filePath)) {
        const existingBytes = await readFile(filePath);
        if (existingBytes.equals(fileBuffer)) {
          return reply.code(200).send({
            ref,
            scope,
            path: relPath,
            sha256: sha256Full,
            bytes: fileBuffer.byteLength,
            mime: sniffedMime,
          });
        }
        return reply.code(409).send({
          code: "HASH_COLLISION",
          message: "A different file already exists with the same content hash",
          retryable: false,
        });
      }

      // Atomic write (UCA-14)
      await atomicWrite(filePath, fileBuffer);

      return reply.code(201).send({
        ref,
        scope,
        path: relPath,
        sha256: sha256Full,
        bytes: fileBuffer.byteLength,
        mime: sniffedMime,
      });
    });
  });
}

export {
  atomicWrite as _atomicWriteForTesting,
  computeSha256 as _computeSha256ForTesting,
  containsTraversal as _containsTraversalForTesting,
  resolveAttachmentDir as _resolveAttachmentDirForTesting,
};
