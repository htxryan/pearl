export function shortId(id: string): string {
  const lastDash = id.lastIndexOf("-");
  if (lastDash === -1) return id;
  return id.slice(lastDash + 1);
}
