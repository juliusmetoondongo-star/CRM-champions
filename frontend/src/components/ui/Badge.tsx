import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = "neutral", className = "", dot = false }: BadgeProps) {
  const variantStyles = {
    success: "bg-accent/20 text-accent border-accent/30",
    warning: "bg-warning/20 text-warning border-warning/30",
    danger: "bg-danger/20 text-danger border-danger/30",
    info: "bg-primary/20 text-primary-light border-primary/30",
    neutral: "bg-muted/20 text-muted border-muted/30",
  };

  const dotStyles = {
    success: "bg-accent",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-primary-light",
    neutral: "bg-muted",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]}`} />}
      {children}
    </span>
  );
}
