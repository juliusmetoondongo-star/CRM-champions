import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

export function Toast({ id, type, message, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
  };

  const backgrounds = {
    success: "bg-emerald-500/10 border-emerald-500/20",
    error: "bg-red-500/10 border-red-500/20",
    info: "bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div
      className={`flex items-start gap-3 min-w-[300px] max-w-md p-4 rounded-xl border ${backgrounds[type]} backdrop-blur-xl shadow-xl animate-slide-up`}
    >
      {icons[type]}
      <p className="flex-1 text-sm text-white">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="text-white/60 hover:text-white transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; type: ToastType; message: string }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
