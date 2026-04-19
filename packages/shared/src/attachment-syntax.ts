/**
 * Pearl Attachment Syntax — Parser & Serializer
 *
 * Inline pill reference (appears in prose):
 *   [img:<ref>]
 * where <ref> is 12 hex chars of SHA-256 (e.g., a1b2c3d4e5f6).
 *
 * Data blocks are HTML comments placed at the END of the field,
 * separated by a blank line:
 *
 * Inline-base64 form:
 *   <!-- pearl-attachment:v1:<ref>
 *   type: inline
 *   mime: image/webp
 *   data: UklGRh4AAABXRUJQVlA4...
 *   -->
 *
 * Local-filesystem form:
 *   <!-- pearl-attachment:v1:<ref>
 *   type: local
 *   mime: image/webp
 *   scope: project
 *   path: attachments/2026/04/a1b2c3d4.webp
 *   sha256: <full-hash>
 *   -->
 */

// ─── Types ──────────────────────────────────────────────────

/** A 12-hex-char reference extracted from a pill */
export interface PillReference {
  /** The 12-hex-char ref (lowercase) */
  ref: string;
  /** Byte offset in the source text where `[img:` starts */
  start: number;
  /** Byte offset in the source text after the closing `]` */
  end: number;
}

/** Base fields common to all attachment data blocks */
interface AttachmentBlockBase {
  /** The 12-hex-char ref matching a pill */
  ref: string;
  /** MIME type, e.g. "image/webp" */
  mime: string;
}

/** Inline-base64 attachment */
export interface InlineAttachment extends AttachmentBlockBase {
  type: "inline";
  /** Base64-encoded image data */
  data: string;
}

/** Local-filesystem attachment */
export interface LocalAttachment extends AttachmentBlockBase {
  type: "local";
  /** Scope qualifier, e.g. "project" */
  scope: string;
  /** Relative path to the file */
  path: string;
  /** Full SHA-256 hash of the file */
  sha256: string;
}

export type AttachmentBlock = InlineAttachment | LocalAttachment;

/** Parsed result of a field containing Pearl attachment syntax */
export interface ParsedAttachments {
  /** The prose portion of the text (before data blocks) */
  prose: string;
  /** All [img:<ref>] pills found in the prose, in order */
  pills: PillReference[];
  /** All parsed data blocks */
  blocks: AttachmentBlock[];
  /** Pills matched to their blocks by ref */
  matched: Map<string, AttachmentBlock>;
  /** Pill refs that have no matching data block */
  unmatchedPills: string[];
  /** Block refs that have no matching pill */
  unmatchedBlocks: string[];
}

/** Input for the serializer: prose text + attachment metadata */
export interface SerializeInput {
  /** The prose text, which should already contain [img:<ref>] pills inline */
  prose: string;
  /** Attachment blocks to serialize at the end */
  blocks: AttachmentBlock[];
}

// ─── Constants ──────────────────────────────────────────────

const REF_PATTERN = "[0-9a-f]{12}";
const SUPPORTED_VERSIONS = new Set(["v1"]);
const MIME_PATTERN = /^[\w+.-]+\/[\w+.-]+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

// ─── Parser ─────────────────────────────────────────────────

/**
 * Extract all [img:<ref>] pill references from text.
 */
export function extractPills(text: string): PillReference[] {
  const pills: PillReference[] = [];
  const regex = new RegExp(`\\[img:(${REF_PATTERN})\\]`, "g");
  for (const match of text.matchAll(regex)) {
    pills.push({
      ref: match[1],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return pills;
}

/**
 * Parse a single data block body (the lines between the header and `-->`).
 * Returns null if the block is malformed or uses an unsupported version.
 */
function parseBlockBody(version: string, ref: string, bodyLines: string[]): AttachmentBlock | null {
  if (!SUPPORTED_VERSIONS.has(version)) {
    return null; // Graceful skip for unknown versions
  }

  const fields = new Map<string, string>();
  for (const line of bodyLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) {
      fields.set(key, value);
    }
  }

  const type = fields.get("type");
  const mime = fields.get("mime");

  if (!type || !mime) return null;
  if (!MIME_PATTERN.test(mime)) return null;

  if (type === "inline") {
    const data = fields.get("data");
    if (!data) return null;
    return { type: "inline", ref, mime, data };
  }

  if (type === "local") {
    const scope = fields.get("scope");
    const path = fields.get("path");
    const sha256 = fields.get("sha256");
    if (!scope || !path || !sha256) return null;
    if (!SHA256_PATTERN.test(sha256)) return null;
    if (/(?:^|\/)\.\.(?:\/|$)/.test(path)) return null;
    return { type: "local", ref, mime, scope, path, sha256 };
  }

  return null; // Unknown type
}

/**
 * Extract all data blocks from the text. Data blocks are HTML comments
 * matching the pattern `<!-- pearl-attachment:v1:<ref> ... -->`.
 */
export function extractBlocks(text: string): AttachmentBlock[] {
  const normalized = text.replace(/\r\n/g, "\n");
  const blocks: AttachmentBlock[] = [];
  const commentRegex = /<!--\s*pearl-attachment:(v\d+):([0-9a-f]{12})[ \t]*\n([\s\S]*?)-->/g;
  let match: RegExpExecArray | null;
  while ((match = commentRegex.exec(normalized)) !== null) {
    const version = match[1];
    const ref = match[2];
    const body = match[3];
    const bodyLines = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const block = parseBlockBody(version, ref, bodyLines);
    if (block) {
      blocks.push(block);
    }
  }
  return blocks;
}

/**
 * Split text into prose (before data blocks) and data-block region.
 * Data blocks are expected at the END of the field, separated by a blank line.
 */
function splitProseAndBlocks(text: string): { prose: string; blockRegion: string } {
  if (/^<!--\s*pearl-attachment:/.test(text)) {
    return { prose: "", blockRegion: text };
  }
  const firstBlockIdx = text.search(/\n\n<!--\s*pearl-attachment:/);
  if (firstBlockIdx === -1) {
    return { prose: text, blockRegion: "" };
  }
  return {
    prose: text.slice(0, firstBlockIdx),
    blockRegion: text.slice(firstBlockIdx),
  };
}

/**
 * Parse a field value containing Pearl attachment syntax.
 * Extracts pills, data blocks, and matches them by ref.
 */
export function parse(text: string): ParsedAttachments {
  const normalized = text.replace(/\r\n/g, "\n");
  let { prose, blockRegion } = splitProseAndBlocks(normalized);
  let blocks: AttachmentBlock[];

  if (blockRegion) {
    blocks = extractBlocks(blockRegion);
  } else {
    blocks = extractBlocks(normalized);
    if (blocks.length > 0) {
      prose = normalized
        .replace(/\n*<!--\s*pearl-attachment:v\d+:[0-9a-f]{12}[ \t]*\n[\s\S]*?-->/g, "")
        .trimEnd();
    }
  }

  const pills = extractPills(prose);

  // Build a map of ref → block for matching
  const blockByRef = new Map<string, AttachmentBlock>();
  for (const block of blocks) {
    blockByRef.set(block.ref, block);
  }

  // Match pills to blocks
  const matched = new Map<string, AttachmentBlock>();
  const unmatchedPills: string[] = [];
  const matchedRefs = new Set<string>();

  for (const pill of pills) {
    const block = blockByRef.get(pill.ref);
    if (block) {
      matched.set(pill.ref, block);
      matchedRefs.add(pill.ref);
    } else {
      unmatchedPills.push(pill.ref);
    }
  }

  const unmatchedBlocks: string[] = [];
  for (const block of blocks) {
    if (!matchedRefs.has(block.ref)) {
      unmatchedBlocks.push(block.ref);
    }
  }

  return {
    prose,
    pills,
    blocks,
    matched,
    unmatchedPills,
    unmatchedBlocks,
  };
}

// ─── Serializer ─────────────────────────────────────────────

/**
 * Serialize a single attachment block to its canonical HTML comment form.
 */
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

/**
 * Serialize prose + attachment blocks into canonical Pearl attachment syntax.
 * Pills should already be inline in the prose.
 * Data blocks are appended at the end, separated by a blank line.
 */
export function serialize(input: SerializeInput): string {
  if (input.blocks.length === 0) {
    return input.prose;
  }

  const serializedBlocks = input.blocks.map(serializeBlock);
  const trimmedProse = input.prose.replace(/\n+$/, "");
  return `${trimmedProse}\n\n${serializedBlocks.join("\n\n")}`;
}
