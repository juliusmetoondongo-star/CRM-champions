import { ReactNode } from "react";
import { Search, Download } from "lucide-react";

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export function Toolbar({ children, className = "" }: ToolbarProps) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${className}`}>
      {children}
    </div>
  );
}

interface ToolbarSectionProps {
  children: ReactNode;
  className?: string;
}

export function ToolbarSection({ children, className = "" }: ToolbarSectionProps) {
  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      {children}
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Rechercher..." }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-4 py-2 bg-[#0F2548] border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition w-full sm:w-64"
      />
    </div>
  );
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
        active
          ? "bg-primary text-white"
          : "bg-[#0F2548] text-white/70 hover:bg-[#132D5A] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function SelectFilter({ value, onChange, options }: SelectFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-2 bg-[#0F2548] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

interface ExportButtonProps {
  onClick: () => void;
  loading?: boolean;
}

export function ExportButton({ onClick, loading = false }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl transition disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      <span className="text-sm font-medium">Exporter CSV</span>
    </button>
  );
}
