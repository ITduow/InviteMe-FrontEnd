import type { ReactNode } from "react";
export type Column<T> = { id: string; header: string; cell: (row: T) => ReactNode };
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  caption: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b bg-muted/50">
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.id} className="px-5 py-4 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b last:border-0">
              {columns.map((column) => (
                <td key={column.id} className="px-5 py-4">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
