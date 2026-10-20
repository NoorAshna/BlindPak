"use client";

import React, { createContext, useContext, useCallback } from "react";
import { toast, Toaster } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({
  showToast: (message: string, type: ToastType = "info") => {
    switch (type) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      case "info":
      default:
        toast.info(message);
        break;
    }
  },
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = useCallback((message: string, type: ToastType = "info") => {
    switch (type) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "warning":
        toast.warning(message);
        break;
      case "info":
      default:
        toast.info(message);
        break;
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
      />
    </ToastContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx;
}

export { toast };
