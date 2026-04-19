// Pearl Attachment Syntax — Parser & Serializer (v1)

// ─── Types ──────────────────────────────────────────────────

export type Ref = string & { __brand: "Ref12" };

export function createRef(hex: string): Ref {
  if (!isRef(hex)) {
    throw new Error(`Invalid ref: expected 12 lowercase hex chars, got "${hex}"`);
  }
  return hex;
}

export function isRef(value: string): value is Ref {
  return /^[0-9a-f]{12}$/.test(value);
}

export interface PillReference {
  ref: Ref;
  start: number;
  end: number;
}

interface AttachmentBlockBase {
  ref: Ref;
  mime: string;
}

export interface InlineAttachment extends AttachmentBlockBase {
  type: "inline";
  data: string;
}

export interface LocalAttachment extends AttachmentBlockBase {
  type: "local";
  scope: "project" | "user";
  path: string;
  sha256: string;
}

export type AttachmentBlock = InlineAttachment | LocalAttachment;

export interface ParsedField {
  prose: string;
  blocks: Map<Ref, AttachmentBlock>;
  refsInProse: Ref[];
  broken: Array<{ ref: Ref; reason: string }>;
}

// ─── Constants ──────────────────────────────────────────────

export const PILL_RE = /\[img:([0-9a-f]{12})\]/g;
const BLOCK_RE_SOURCE = "<!--\\s*pearl-attachment:(v\\d+):([0-9a-f]{12})[ \\t]*\\n([\\s\\S]*?)-->";
export const SUPPORTED_VERSIONS = new Set(["v1"]);
const MIME_PATTERN = /^[\w+.-]+\/[\w+.-]+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const VALID_SCOPES = new Set<string>(["project", "user"]);

// ─── Parser ─────────────────────────────────────────────────

export function extractPills(text: string): PillReference[] {
  const pills: PillReference[] = [];
  const regex = new RegExp(PILL_RE.source, "g");
  for (const match of text.matchAll(regex)) {
    pills.push({
      ref: match[1] as Ref,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return pills;
}

type BlockParseResult = { ok: true; block: AttachmentBlock } | { ok: false; reason: string };

function parseBlockBody(version: string, ref: Ref, bodyLines: string[]): BlockParseResult {
  if (!SUPPORTED_VERSIONS.has(version)) {
    return { ok: false, reason: `unsupported version: ${version}` };
  }

  const fields = new Map<string, string>();
  for (const line of bodyLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) fields.set(key, value);
  }

  const type = fields.get("type");
  const mime = fields.get("mime");

  if (!type) return { ok: false, reason: "missing type field" };
  if (!mime) return { ok: false, reason: "missing mime field" };
  if (!MIME_PATTERN.test(mime)) return { ok: false, reason: `invalid mime: ${mime}` };

  if (type === "inline") {
    const data = fields.get("data");
    if (!data) return { ok: false, reason: "inline block missing data field" };
    return { ok: true, block: { type: "inline", ref, mime, data } };
  }

  if (type === "local") {
    const scope = fields.get("scope");
    const path = fields.get("path");
    const sha256 = fields.get("sha256");
    if (!scope) return { ok: false, reason: "local block missing scope field" };
    if (!VALID_SCOPES.has(scope)) return { ok: false, reason: `invalid scope: ${scope}` };
    if (!path) return { ok: false, reason: "local block missing path field" };
    if (!sha256) return { ok: false, reason: "local block missing sha256 field" };
    if (!SHA256_PATTERN.test(sha256)) return { ok: false, reason: `invalid sha256: ${sha256}` };
    if (/(?:^|\/)\.\.(?:\/|$)/.test(path))
      return { ok: false, reason: `path traversal rejected: ${path}` };
    return {
      ok: true,
      block: {
        type: "local",
        ref,
        mime,
        scope: scope as "project" | "user",
        path,
        sha256,
      },
    };
  }

  return { ok: false, reason: `unknown block type: ${type}` };
}

type ExtractedBlockResult =
  | { ok: true; block: AttachmentBlock }
  | { ok: false; ref: Ref; reason: string };

function extractBlocksWithBroken(text: string): ExtractedBlockResult[] {
  const results: ExtractedBlockResult[] = [];
  const regex = new RegExp(BLOCK_RE_SOURCE, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const version = match[1];
    const ref = match[2] as Ref;
    const body = match[3];
    const bodyLines = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const result = parseBlockBody(version, ref, bodyLines);
    if (result.ok) {
      results.push({ ok: true, block: result.block });
    } else {
      results.push({ ok: false, ref, reason: result.reason });
    }
  }
  return results;
}

export function extractBlocks(text: string): AttachmentBlock[] {
  const normalized = text.replace(/\r\n/g, "\n");
  return extractBlocksWithBroken(normalized)
    .filter((r): r is { ok: true; block: AttachmentBlock } => r.ok)
    .map((r) => r.block);
}

function splitProseAndTrailing(text: string): { prose: string; trailing: string } | null {
  if (/^<!--\s*pearl-attachment:/.test(text)) {
    return { prose: "", trailing: text };
  }
  const firstBlockIdx = text.search(/\n\n<!--\s*pearl-attachment:/);
  if (firstBlockIdx === -1) return null;
  return {
    prose: text.slice(0, firstBlockIdx),
    trailing: text.slice(firstBlockIdx),
  };
}

export function parseField(text: string): ParsedField {
  const normalized = text.replace(/\r\n/g, "\n");
  const broken: Array<{ ref: Ref; reason: string }> = [];
  const blocks = new Map<Ref, AttachmentBlock>();

  const split = splitProseAndTrailing(normalized);
  let prose: string;

  if (split) {
    prose = split.prose;
    for (const result of extractBlocksWithBroken(split.trailing)) {
      if (result.ok) {
        blocks.set(result.block.ref, result.block);
      } else {
        broken.push({ ref: result.ref, reason: result.reason });
      }
    }
  } else {
    // No trailing region found — check for interleaved blocks (UCA-9)
    const blockRegex = new RegExp(BLOCK_RE_SOURCE, "g");
    const hasBlocks = blockRegex.test(normalized);

    if (hasBlocks) {
      // Blocks are interleaved with prose — reject them as broken
      const regex = new RegExp(BLOCK_RE_SOURCE, "g");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(normalized)) !== null) {
        const ref = match[2] as Ref;
        broken.push({
          ref,
          reason: "block interleaved with prose (not in trailing region)",
        });
      }
      // Strip block markup from prose
      prose = normalized
        .replace(/\n*<!--\s*pearl-attachment:v\d+:[0-9a-f]{12}[ \t]*\n[\s\S]*?-->/g, "")
        .trimEnd();
    } else {
      prose = normalized;
    }
  }

  const pills = extractPills(prose);
  const refsInProse = pills.map((p) => p.ref);

  return { prose, blocks, refsInProse, broken };
}

// ─── Serializer ─────────────────────────────────────────────

function serializeBlock(block: AttachmentBlock): string {
  const lines: string[] = [];
  lines.push(`<!-- pearl-attachment:v1:${block.ref}`);
  lines.push(`type: ${block.type}`);
  lines.push(`mime: ${block.mime}`);

  if (block.type === "inline") {
    lines.push(`data: ${block.data}`);
  } else {
    lines.push(`scope: ${block.scope}`);
    lines.push(`path: ${block.path}`);
    lines.push(`sha256: ${block.sha256}`);
  }

  lines.push("-->");
  return lines.join("\n");
}

export function serializeField(prose: string, blocks: AttachmentBlock[]): string {
  if (blocks.length === 0) return prose;
  const serialized = blocks.map(serializeBlock);
  const trimmedProse = prose.replace(/\n+$/, "");
  return `${trimmedProse}\n\n${serialized.join("\n\n")}`;
}

// ─── Async Worker Wrapper (U12) ─────────────────────────────

const WORKER_THRESHOLD = 256 * 1024;

export async function parseFieldAsync(text: string): Promise<ParsedField> {
  if (text.length < WORKER_THRESHOLD || typeof Worker === "undefined") {
    return parseField(text);
  }

  /* v8 ignore start -- Worker branch only runs in browser; tested via E2E */
  const worker = new Worker(new URL("./attachment-worker.js", import.meta.url), { type: "module" });

  return new Promise<ParsedField>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;
      resolve({
        prose: data.prose,
        blocks:
          data.blocks instanceof Map ? data.blocks : new Map(Object.entries(data.blocks ?? {})),
        refsInProse: data.refsInProse,
        broken: data.broken,
      } as ParsedField);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(new Error(`Attachment worker error: ${e.message}`));
      worker.terminate();
    };
    worker.postMessage(text);
  });
  /* v8 ignore stop */
}

// ─── Fast Predicate ─────────────────────────────────────────

const QUICK_PILL_RE = /\[img:[0-9a-f]{12}\]/;
const QUICK_BLOCK_RE = /<!--\s*pearl-attachment:/;

export function hasAttachmentSyntax(text: string): boolean {
  return QUICK_PILL_RE.test(text) || QUICK_BLOCK_RE.test(text);
}

// ─── Collision Disambiguator (X3) ───────────────────────────

export function disambiguateRefs(blocks: AttachmentBlock[]): AttachmentBlock[] {
  const seen = new Map<string, number>();
  const result: AttachmentBlock[] = [];

  for (const block of blocks) {
    const baseRef = block.ref as string;
    const count = seen.get(baseRef) ?? 0;
    seen.set(baseRef, count + 1);

    if (count === 0) {
      result.push(block);
    } else {
      const suffix = count.toString(16).padStart(2, "0");
      const newRef = (baseRef.slice(0, 10) + suffix) as Ref;
      result.push({ ...block, ref: newRef });
    }
  }

  return result;
}
