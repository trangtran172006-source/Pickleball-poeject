"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  showClose?: boolean;
  widthClass?: string;
  children?: ReactNode;
  footer?: ReactNode;
};

/** Centered dialog over a dimmed page, as in the confirmation frames. */
export function Modal({ open, onClose, title, subtitle, icon, showClose, widthClass = "max-w-[420px]", children, footer }: ModalProps) {
  const t = useTranslations("common");
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#202e27]/45 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn("my-auto w-full rounded-2xl bg-white p-6 shadow-2xl outline-none", widthClass)}
      >
        <div className="flex items-start gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[17px] font-semibold text-ink">
              {title}
            </h2>
            {subtitle && <p className="mt-1.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {showClose && (
            <button type="button" onClick={onClose} aria-label={t("close")} className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-md text-muted hover:bg-page">
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

type ConfirmProps = Omit<ModalProps, "footer"> & {
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
};

export function ConfirmDialog({ onConfirm, confirmLabel, cancelLabel, loading, onClose, ...rest }: ConfirmProps) {
  const t = useTranslations("common");
  return (
    <Modal
      {...rest}
      onClose={loading ? () => {} : onClose}
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={loading}>
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button onClick={onConfirm} loading={loading} data-confirm>
            {confirmLabel ?? t("confirm")}
          </Button>
        </>
      }
    />
  );
}
