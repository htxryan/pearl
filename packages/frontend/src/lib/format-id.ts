export function shortId(id: string): string {
  const parts = id.split("-");
  if (parts.length <= 1) return id;
  if (parts.length <= 2) return parts[parts.length - 1];
  return parts.slice(-2).join("-");
}

export function displayId(id: string, projectPrefix: string | undefined): string {
  if (!projectPrefix) return shortId(id);
  const prefix = `${projectPrefix}-`;
  if (id.startsWith(prefix)) return id.slice(prefix.length);
  return id;
}
