import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export function Input({ label, error, hint, icon, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs md:text-sm font-medium text-white mb-1.5 md:mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}
        <input
          className={`w-full ${icon ? "pl-10" : "pl-3 md:pl-4"} pr-3 md:pr-4 py-2 md:py-2.5 text-sm md:text-base bg-surface border border-white/10 rounded-lg md:rounded-xl text-white placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent hover:border-white/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${error ? "border-danger focus:ring-danger" : ""} ${className}`}
          {...props}
        />
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
