"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CloudUpload, FileImage, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useFormat } from "@/i18n/useFormat";
import { Button } from "./Button";

export const IMAGE_TYPES = ["image/jpeg", "image/png"];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  hint?: ReactNode;
  /** Button shown inside the empty drop area instead of the plain hint text. */
  buttonLabel?: string;
  disabled?: boolean;
};

/**
 * Image upload area: click or drag a JPG/PNG up to 5 MB. Once a file is
 * chosen it shows the preview with "Replace image" and "Remove image".
 */
export function ImageDropzone({ file, onChange, error, hint, buttonLabel, disabled }: Props) {
  const t = useTranslations("common");
  const tv = useTranslations("validation");
  const f = useFormat();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<"fileType" | "fileSize" | null>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const accept = (candidate: File | undefined | null) => {
    if (!candidate) return;
    if (!IMAGE_TYPES.includes(candidate.type)) return setProblem("fileType");
    if (candidate.size > IMAGE_MAX_BYTES) return setProblem("fileSize");
    setProblem(null);
    onChange(candidate);
  };
  const message = problem ? tv(problem) : error;

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        tabIndex={-1}
        data-file-input
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {file && preview ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border border-line bg-page sm:w-56">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <FileImage aria-hidden className="size-4 shrink-0 text-subtle" strokeWidth={1.75} />
              <span className="truncate" data-file-name>{file.name}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">{t("uploaded", { size: f.fileSize(file.size) })}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button variant="neutral" size="sm" disabled={disabled} onClick={() => input.current?.click()} iconLeft={<RefreshCw aria-hidden className="size-3.5 text-brand" />}>
                {t("replaceImage")}
              </Button>
              <Button
                variant="neutral"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setProblem(null);
                  onChange(null);
                }}
                iconLeft={<Trash2 aria-hidden className="size-3.5 text-brand" />}
              >
                {t("removeImage")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-disabled={disabled}
          data-dropzone
          onClick={() => !disabled && input.current?.click()}
          onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && !disabled && input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) accept(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center outline-none transition-colors focus-visible:border-brand",
            dragging ? "border-brand bg-brand-soft" : message ? "border-danger bg-danger-soft/40" : "border-[#cfd8d1] bg-page",
          )}
        >
          <CloudUpload aria-hidden className="size-6 text-brand" strokeWidth={1.5} />
          {buttonLabel ? (
            <>
              <span className="text-xs text-body">{hint ?? t("uploadHint")}</span>
              <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-brand">{buttonLabel}</span>
            </>
          ) : (
            <span className="text-[13px] font-medium text-brand">{hint ?? t("uploadHint")}</span>
          )}
          <span className="text-[11px] text-subtle">
            {t("uploadRule")} · {t("noFile")}
          </span>
        </div>
      )}
      {message && (
        <p role="alert" className="mt-1.5 text-xs text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
