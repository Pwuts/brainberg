"use client";

import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: string;
  dir: SortDir;
}

export interface TableColumn<T> {
  key: string;
  label: ReactNode;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  /**
   * Extracts the value used when sorting locally by this column.
   * Ignored in controlled-sort mode (parent sorts the `rows` array itself).
   * Return a number for numeric or date columns (use `.getTime()` for dates)
   * so first-click direction is inferred as descending.
   */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Override first-click sort direction. Defaults: numeric → desc, text → asc. */
  defaultDir?: SortDir;
  className?: string;
  headerClassName?: string;
}

interface SortableTableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  defaultSort?: SortState;
  emptyMessage?: ReactNode;
  onRowClick?: (row: T) => void;
  /**
   * Controlled-sort mode. When `sort` is provided, the table renders `rows`
   * in the given order (no local sorting) and calls `onSortChange` on header
   * clicks — use this to drive server-side sorting via URL params.
   */
  sort?: SortState | null;
  onSortChange?: (next: SortState) => void;
}

function initialSortDir<T>(col: TableColumn<T>, rows: T[]): SortDir {
  if (col.defaultDir) return col.defaultDir;
  if (!col.sortValue) return "asc";
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const v = col.sortValue(rows[i]);
    if (v == null) continue;
    return typeof v === "number" ? "desc" : "asc";
  }
  return "asc";
}

export function SortableTable<T>({
  columns,
  rows,
  rowKey,
  defaultSort,
  emptyMessage = "No rows.",
  onRowClick,
  sort: controlledSort,
  onSortChange,
}: SortableTableProps<T>) {
  const isControlled = controlledSort !== undefined;
  const [localSort, setLocalSort] = useState<SortState | null>(
    defaultSort ?? null,
  );
  const sort = isControlled ? controlledSort : localSort;

  const displayed = useMemo(() => {
    if (isControlled || !sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      // Nullish values sort to the bottom regardless of direction.
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [isControlled, rows, columns, sort]);

  const toggleSort = (col: TableColumn<T>) => {
    if (!col.sortable) return;
    const next: SortState =
      !sort || sort.key !== col.key
        ? { key: col.key, dir: initialSortDir(col, rows) }
        : { key: col.key, dir: sort.dir === "asc" ? "desc" : "asc" };
    if (isControlled) onSortChange?.(next);
    else setLocalSort(next);
  };

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            {columns.map((col) => {
              const isSorted = sort?.key === col.key;
              const SortIcon = isSorted
                ? sort.dir === "asc"
                  ? ChevronUp
                  : ChevronDown
                : ChevronsUpDown;
              return (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  className={cn(
                    "px-4 py-2 font-medium",
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                        ? "text-center"
                        : "text-left",
                    col.sortable && "cursor-pointer select-none hover:bg-accent",
                    col.headerClassName,
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      col.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {col.label}
                    {col.sortable && (
                      <SortIcon
                        className={cn(
                          "h-3.5 w-3.5",
                          isSorted
                            ? "text-foreground"
                            : "text-muted-foreground/40",
                        )}
                      />
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayed.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b last:border-0",
                onRowClick && "cursor-pointer hover:bg-accent/50",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-2",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
          {displayed.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
