"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";
type ToastInput = { title: string; message?: string; tone?: ToastTone };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);

  const value = useMemo(() => pushToast, [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 bottom-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="admin-card admin-page-enter border-l-4 p-4 shadow-[var(--admin-shadow-floating)]"
            style={{
              borderLeftColor:
                toast.tone === "error"
                  ? "var(--admin-danger)"
                  : toast.tone === "success"
                    ? "var(--admin-success)"
                    : "var(--admin-info)",
            }}
          >
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.message && (
              <p className="mt-0.5 text-xs text-[var(--admin-ink-secondary)]">{toast.message}</p>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const pushToast = useContext(ToastContext);
  if (!pushToast) throw new Error("useToast must be used inside ToastProvider");
  return pushToast;
}
