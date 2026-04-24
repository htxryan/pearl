import type { Header, Table } from "@tanstack/react-table";
import type { CSSProperties } from "react";

/**
 * Computes the inline style for a table header/cell.
 *
 * - Non-flex columns shrink to fit their content (width: 1% + nowrap is the
 *   classic CSS trick for that in `table-layout: auto`).
 * - The flex column claims the remaining space. `maxWidth: 0` lets inner
 *   `truncate` content collapse below its content width.
 * - When the user has resized the flex column, its explicit width is used
 *   (and acts as a hard cap so the remaining space goes to nothing).
 */
export function getColumnStyle<T>(header: Header<T, unknown>, table: Table<T>): CSSProperties {
  const isFlex = header.column.columnDef.meta?.flex === true;
  if (!isFlex) {
    return { width: "1%", whiteSpace: "nowrap" };
  }
  const explicit = table.getState().columnSizing[header.column.id];
  if (typeof explicit === "number") {
    return { width: explicit, maxWidth: explicit };
  }
  return { width: "100%", maxWidth: 0 };
}

export function getCellStyle<T>(
  cell: { column: { id: string; columnDef: { meta?: { flex?: boolean } } } },
  table: Table<T>,
): CSSProperties {
  const isFlex = cell.column.columnDef.meta?.flex === true;
  if (!isFlex) {
    return { width: "1%", whiteSpace: "nowrap" };
  }
  const explicit = table.getState().columnSizing[cell.column.id];
  if (typeof explicit === "number") {
    return { width: explicit, maxWidth: explicit };
  }
  return { width: "100%", maxWidth: 0 };
}
