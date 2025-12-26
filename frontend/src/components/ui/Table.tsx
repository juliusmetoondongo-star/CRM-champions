import { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className={`w-full ${className}`}>
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  sticky?: boolean;
}

export function TableHeader({ children, sticky = false }: TableHeaderProps) {
  return (
    <thead className={`bg-surface/80 backdrop-blur-sm ${sticky ? "sticky top-0 z-10" : ""}`}>
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody className="divide-y divide-white/5">{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function TableRow({ children, className = "", hover = true }: TableRowProps) {
  return (
    <tr className={`${hover ? "hover:bg-white/5 transition-colors duration-150" : ""} even:bg-white/[0.02] ${className}`}>
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: ReactNode;
  className?: string;
}

export function TableHead({ children, className = "" }: TableHeadProps) {
  return (
    <th className={`px-4 py-3.5 text-left text-xs font-semibold text-muted uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
}

export function TableCell({ children, className = "" }: TableCellProps) {
  return (
    <td className={`px-4 py-3.5 text-sm text-white ${className}`}>
      {children}
    </td>
  );
}
