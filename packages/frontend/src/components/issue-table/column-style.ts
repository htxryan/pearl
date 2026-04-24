import type { RowData, Table } from "@tanstack/react-table";
import type { CSSProperties } from "react";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: required for module augmentation
  interface ColumnMeta<TData extends RowData, TValue> {
    flex?: boolean;
  }
}

interface ColumnRef {
  column: { id: string; columnDef: { meta?: { flex?: boolean } } };
}

export function getColumnStyle<T>(headerOrCell: ColumnRef, table: Table<T>): CSSProperties {
  const isFlex = headerOrCell.column.columnDef.meta?.flex === true;
  if (!isFlex) {
    return { width: "1%", whiteSpace: "nowrap" };
  }
  const explicit = table.getState().columnSizing[headerOrCell.column.id];
  if (typeof explicit === "number") {
    return { width: explicit, maxWidth: explicit };
  }
  return { width: "100%", maxWidth: 0 };
}
