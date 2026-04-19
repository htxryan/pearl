/**
 * Local filesystem storage pipeline prototype for Pearl image attachments.
 *
 * Provides scope resolution, atomic writes, path-traversal safety,
 * content-addressable ref generation, and Pearl data-block syntax.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocalStorageConfig {
  scope: "project" | "user";
  projectRoot: string;
  projectId: string;
  projectPathOverride?: string | null;
  userPathOverride?: string | null;
}

// ---------------------------------------------------------------------------
// Scope Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the base directory for attachment storage based on the given config.
 *
 * - **project** scope: `<projectRoot>/.pearl/attachments/`
 * - **user** scope:    `~/.pearl/attachments/<projectId>/`
 *
 * Either scope can be overridden via the corresponding `*PathOverride` field.
 */
export function resolveBasePath(config: LocalStorageConfig): string {
  if (config.scope === "project") {
    return config.projectPathOverride
      ? path.resolve(config.projectRoot, config.projectPathOverride)
      : path.join(config.projectRoot, ".pearl", "attachments");
  }
  return config.userPathOverride
    ? config.userPathOverride
    : path.join(os.homedir(), ".pearl", "attachments", config.projectId);
}

// ---------------------------------------------------------------------------
// Path Traversal Safety
// ---------------------------------------------------------------------------

/**
 * Validate that `requestedPath` resolves to a location *inside* `basePath`.
 * Throws if the resolved path escapes the base directory.
 */
export function validatePath(basePath: string, requestedPath: string): string {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(basePath, requestedPath);

  // Ensure the target starts with the base followed by a separator (or is the
  // base itself). Without the separator check, a sibling directory whose name
  // starts with the same prefix could slip through.
  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)
  ) {
    throw new Error(
      `Path traversal detected: "${requestedPath}" resolves outside base "${resolvedBase}"`,
    );
  }
  return resolvedTarget;
}

// ---------------------------------------------------------------------------
// Ref Generation (content-addressable)
// ---------------------------------------------------------------------------

/**
 * Compute a 12-hex-character ref from the SHA-256 digest of `bytes`.
 */
export function computeRef(bytes: Buffer): string {
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  return hash.slice(0, 12);
}

/**
 * Return the full SHA-256 hex digest of `bytes`.
 */
export function fullSha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

// ---------------------------------------------------------------------------
// Atomic File Write
// ---------------------------------------------------------------------------

/**
 * Atomically write `bytes` to `<basePath>/<YYYY>/<MM>/<ref>.<ext>`.
 *
 * 1. Create target directory if needed.
 * 2. Write to a temp file in the same directory.
 * 3. `rename()` (atomic on the same filesystem) to the final name.
 *
 * Returns the *relative* path from `basePath` to the written file.
 */
export async function writeAttachmentAtomic(
  basePath: string,
  ref: string,
  bytes: Buffer,
  mime: string,
): Promise<string> {
  const ext = mimeToExtension(mime);
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const dir = path.join(basePath, yyyy, mm);
  const filename = `${ref}.${ext}`;
  const finalPath = path.join(dir, filename);

  // Validate that the final path stays inside basePath.
  validatePath(basePath, path.join(yyyy, mm, filename));

  await fs.promises.mkdir(dir, { recursive: true });

  // Write to a temp file in the same directory for same-filesystem atomicity.
  const tmpName = `.tmp-${crypto.randomBytes(8).toString("hex")}`;
  const tmpPath = path.join(dir, tmpName);

  try {
    await fs.promises.writeFile(tmpPath, bytes);
    await fs.promises.rename(tmpPath, finalPath);
  } catch (err) {
    // Best-effort cleanup of the temp file on failure.
    try {
      await fs.promises.unlink(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }

  return path.relative(basePath, finalPath);
}

// ---------------------------------------------------------------------------
// Pearl Local Data Block
// ---------------------------------------------------------------------------

/**
 * Generate a Pearl local-mode data block (HTML comment syntax).
 */
export function generateLocalDataBlock(
  ref: string,
  mime: string,
  scope: "project" | "user",
  relativePath: string,
  sha256: string,
): string {
  return [
    `<!-- pearl-attachment:v1:${ref}`,
    `type: local`,
    `mime: ${mime}`,
    `scope: ${scope}`,
    `path: ${relativePath}`,
    `sha256: ${sha256}`,
    `-->`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mimeToExtension(mime: string): string {
  const map: Record<string, string> = {
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return map[mime] ?? "bin";
}
