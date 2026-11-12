"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input, type InputProps } from "./Input";

/** Password field with the show/hide eye toggle from the design. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type" | "right">>(
  function PasswordInput(props, ref) {
    const t = useTranslations("auth");
    const [visible, setVisible] = useState(false);
    const Icon = visible ? Eye : EyeOff;
    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        right={
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            aria-pressed={visible}
            className="flex size-8 items-center justify-center rounded-md text-body hover:bg-page"
          >
            <Icon className="size-[18px]" strokeWidth={1.75} />
          </button>
        }
        {...props}
      />
    );
  },
);
