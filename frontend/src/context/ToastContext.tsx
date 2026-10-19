"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

// ── Icons & colors per type ───────────────────────────────────────────────────

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="shrink-0 text-emerald-500" />,
  error: <XCircle size={18} className="shrink-0 text-red-500" />,
  info: <Info size={18} className="shrink-0 text-blue-500" />,
  warning: <AlertTriangle size={18} className="shrink-0 text-amber-500" />,
};

const borderMap: Record<ToastType, string> = {
  success: "border-l-emerald-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
  warning: "border-l-amber-500",
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      // Auto-dismiss after 3.5 s
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col gap-3"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-l-4 bg-white px-4 py-3 shadow-lg ${borderMap[toast.type]}`}
            >
              {iconMap[toast.type]}
              <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-auto mt-0.5 rounded p-0.5 text-gray-400 hover:text-gray-700 transition"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
