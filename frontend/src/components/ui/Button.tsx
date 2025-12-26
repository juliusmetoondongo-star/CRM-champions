import { ReactNode, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "rounded-lg md:rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 touch-manipulation";

  const variantStyles = {
    primary: "bg-primary hover:bg-primary-light text-white focus-visible:ring-primary shadow-lg hover:shadow-xl",
    secondary: "bg-surface hover:bg-surface-2 text-white focus-visible:ring-muted border border-white/10",
    danger: "bg-danger hover:bg-danger/90 text-white focus-visible:ring-danger shadow-lg",
    ghost: "bg-transparent hover:bg-white/5 text-muted hover:text-white focus-visible:ring-muted",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs md:text-sm",
    md: "px-4 py-2.5 text-sm md:text-base",
    lg: "px-5 md:px-6 py-2.5 md:py-3 text-base md:text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
