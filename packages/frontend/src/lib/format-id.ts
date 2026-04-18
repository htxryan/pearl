export function shortId(id: string): string {
  const parts = id.split("-");
  if (parts.length <= 1) return id;
  if (parts.length <= 2) return parts[parts.length - 1];
  return parts.slice(-2).join("-");
}
