import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "glass" | "gradient";
  hover?: boolean;
}

export function Card({ children, className = "", variant = "default", hover = false }: CardProps) {
  const baseStyles = "rounded-2xl p-5 md:p-6 transition-all duration-300";

  const variantStyles = {
    default: "bg-surface-2 shadow-premium",
    glass: "bg-surface-2/60 backdrop-blur-xl border border-white/10 shadow-glass",
    gradient: "bg-gradient-to-br from-surface-2 to-surface shadow-premium",
  };

  const hoverStyles = hover ? "hover:-translate-y-0.5 hover:shadow-glass cursor-pointer" : "";

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function CardHeader({ children, className = "", actions }: CardHeaderProps) {
  return (
    <div className={`mb-4 flex items-center justify-between ${className}`}>
      <div>{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = "" }: CardTitleProps) {
  return (
    <h3 className={`text-lg md:text-xl font-semibold text-white ${className}`}>
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
