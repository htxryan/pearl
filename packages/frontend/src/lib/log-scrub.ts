const BLOCK_DATA_RE =
  /(<!--\s*pearl-attachment:v\d+:[0-9a-f]{12}\s*\n(?:[^\n]*\n)*?)(data:\s*)([A-Za-z0-9+/=]{32,})((?:\n[^\n]*)*?\n-->)/g;

// Matches data URIs with MIME type (e.g. data:image/webp;base64,...)
const BASE64_INLINE_RE = /(["']?)data:[a-zA-Z]+\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]{64,})\1/g;

export function scrubAttachmentData(text: string): string {
  let result = text.replace(BLOCK_DATA_RE, (_match, prefix, dataKey, base64, suffix) => {
    const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
    return `${prefix}${dataKey}<redacted ${sizeKB}KB>${suffix}`;
  });

  result = result.replace(BASE64_INLINE_RE, (_match, quote, base64) => {
    const sizeKB = Math.round((base64.length * 3) / 4 / 1024);
    return `${quote}data: <redacted ${sizeKB}KB>${quote}`;
  });

  return result;
}
