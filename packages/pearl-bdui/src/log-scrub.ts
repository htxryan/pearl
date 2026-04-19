const BLOCK_DATA_RE =
  /(<!--\s*pearl-attachment:v\d+:[0-9a-f]{12}\s*\n(?:[^\n]*\n)*?)(data:\s*)([A-Za-z0-9+/=]{32,})((?:\n[^\n]*)*?\n-->)/g;

const BASE64_INLINE_RE = /(["']?)data:[a-zA-Z]+\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]{64,})\1/g;

const RAW_BASE64_RE = /[A-Za-z0-9+/=]{1024,}/g;

export function scrubBase64(text: string): string {
  let result = text.replace(BLOCK_DATA_RE, (_match, prefix, dataKey, base64, suffix) => {
    const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
    return `${prefix}${dataKey}<redacted ${sizeKB}KB>${suffix}`;
  });

  result = result.replace(BASE64_INLINE_RE, (_match, quote, base64) => {
    const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
    return `${quote}data: <redacted ${sizeKB}KB>${quote}`;
  });

  result = result.replace(RAW_BASE64_RE, (match) => {
    const sizeKB = Math.round((match.length * 3) / 4 / 1024);
    return `<redacted ${sizeKB}KB>`;
  });

  return result;
}

function scrubValue(value: unknown, seen?: WeakSet<object>): unknown {
  if (typeof value === "string" && value.length > 512) {
    return scrubBase64(value);
  }
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    const visited = seen ?? new WeakSet();
    if (visited.has(value as object)) return "[Circular]";
    visited.add(value as object);
    if (Array.isArray(value)) {
      return value.map((v) => scrubValue(v, visited));
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = scrubValue(v, visited);
    }
    return result;
  }
  return value;
}

export function createScrubSerializer() {
  return {
    req(req: Record<string, unknown>): Record<string, unknown> {
      return scrubValue(req) as Record<string, unknown>;
    },
    res(res: Record<string, unknown>): Record<string, unknown> {
      return scrubValue(res) as Record<string, unknown>;
    },
  };
}
