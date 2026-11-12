"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; text: string };
type ToastApi = { show: (tone: Tone, text: string) => void };

const ToastContext = createContext<ToastApi>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

const icons = { success: CircleCheck, error: CircleX, info: Info };
const tones: Record<Tone, string> = {
  success: "border-brand/40 bg-white text-brand",
  error: "border-danger-line bg-white text-danger",
  info: "border-line bg-white text-ink",
};

/** Short-lived messages for actions that have no inline place to report to. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const show = useCallback((tone: Tone, text: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, tone, text }]);
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 4000);
  }, []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = icons[toast.tone];
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              data-toast={toast.tone}
              className={cn(
                "pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium shadow-lg",
                tones[toast.tone],
              )}
            >
              <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={1.75} />
              {toast.text}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
