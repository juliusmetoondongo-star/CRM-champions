import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Dialog({ open, onClose, title, children, maxWidth = "md" }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const maxWidths = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative bg-[#0F2548] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl ${maxWidths[maxWidth]} w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
          <h2 className="text-lg sm:text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-1 text-white/60 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-60px)] sm:max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

interface DialogFooterProps {
  children: ReactNode;
}

export function DialogFooter({ children }: DialogFooterProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 bg-[#0B1B36]">
      {children}
    </div>
  );
}

interface DialogBodyProps {
  children: ReactNode;
}

export function DialogBody({ children }: DialogBodyProps) {
  return <div className="px-4 sm:px-6 py-3 sm:py-4">{children}</div>;
}
