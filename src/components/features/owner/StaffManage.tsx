"use client";

import { useState } from "react";
import { Lock, LockOpen, Plus, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, PageTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/States";
import { Badge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { EMAIL_PATTERN, PASSWORD_PATTERN, PHONE_PATTERN } from "@/shared/schemas/auth";
import { accountStatusKey } from "@/i18n/status";
import { staffAdminApi } from "@/services/api/owner";
import type { StaffAccountRow } from "@/shared/types";

const schema = z.object({
  fullName: z.string().trim().min(2, "required").max(70, "wrongFormat"),
  email: z.string().trim().regex(EMAIL_PATTERN, "email"),
  phone: z.string().trim().regex(PHONE_PATTERN, "phone"),
  password: z.string().regex(PASSWORD_PATTERN, "password"),
});
type FormValues = z.infer<typeof schema>;

/** Owner staff accounts: list, create, lock/unlock (Q15). */
export function StaffManage() {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const toast = useToast();
  const client = useQueryClient();
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const [adding, setAdding] = useState(false);
  const list = useQuery({ queryKey: ["staff-admin"], queryFn: () => staffAdminApi.list() });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { fullName: "", email: "", phone: "", password: "" } });

  const create = useMutation({
    mutationFn: (values: FormValues) => staffAdminApi.create(values),
    onSuccess: () => {
      toast.show("success", t("created"));
      setAdding(false);
      reset();
      void client.invalidateQueries({ queryKey: ["staff-admin"] });
    },
    onError: (error) => toast.show("error", errorText(error, "errors.staffCreateFailed")),
  });
  const toggle = useMutation({
    mutationFn: (row: StaffAccountRow) => staffAdminApi.setStatus(row.id, row.status === "Khóa" ? "Hoạt động" : "Khóa"),
    onSuccess: () => {
      toast.show("success", t("updated"));
      void client.invalidateQueries({ queryKey: ["staff-admin"] });
    },
    onError: (error) => toast.show("error", errorText(error, "errors.staffUpdateFailed")),
  });

  return (
    <div>
      <PageTitle
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Button onClick={() => { reset(); setAdding(true); }} iconLeft={<Plus aria-hidden className="size-4" />} data-add-staff>
            {t("add")}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <Users aria-hidden className="size-4 text-brand" strokeWidth={1.75} />
          <h2 className="text-[15px] font-medium text-ink">{t("listTitle")}</h2>
        </div>
        {list.isPending ? (
          <SkeletonRows rows={4} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-page text-[10px] text-subtle">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">{t("staffCode")}</th>
                  <th scope="col" className="px-3 py-3 font-medium">{tc("email")}</th>
                  <th scope="col" className="px-3 py-3 font-medium">{tc("phone")}</th>
                  <th scope="col" className="px-3 py-3 font-medium">{tc("status")}</th>
                  <th scope="col" className="px-5 py-3 font-medium text-right">{tc("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((row) => (
                  <tr key={row.id} data-staff={row.staffCode} className="border-t border-line text-xs">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.fullName} className="size-8 text-[11px]" />
                        <span>
                          <span className="block font-medium text-ink">{row.fullName}</span>
                          <span className="mt-0.5 block text-[10px] text-subtle">{row.staffCode}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-body">{row.email}</td>
                    <td className="px-3 py-3.5 text-body">{row.phone}</td>
                    <td className="px-3 py-3.5">
                      <Badge tone={row.status === "Hoạt động" ? "green" : "red"}>{ts(accountStatusKey[row.status])}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant={row.status === "Khóa" ? "ghost" : "danger"}
                        size="sm"
                        loading={toggle.isPending && toggle.variables?.id === row.id}
                        onClick={() => toggle.mutate(row)}
                        iconLeft={row.status === "Khóa" ? <LockOpen aria-hidden className="size-3.5" /> : <Lock aria-hidden className="size-3.5" />}
                        data-toggle-staff
                      >
                        {row.status === "Khóa" ? t("unlock") : t("lock")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title={t("addTitle")} subtitle={t("addSub")} icon={<span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand"><Plus aria-hidden className="size-[18px]" /></span>}>
        <form onSubmit={handleSubmit((values) => create.mutate(values))} noValidate className="flex flex-col gap-4">
          {create.isError && <Banner tone="error" title={errorText(create.error, "errors.staffCreateFailed")} />}
          <Field label={tc("fullName")} htmlFor="fullName" required error={fieldError(errors.fullName?.message)}>
            <Input id="fullName" invalid={!!errors.fullName} {...register("fullName")} />
          </Field>
          <Field label={tc("email")} htmlFor="email" required error={fieldError(errors.email?.message)}>
            <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label={tc("phone")} htmlFor="phone" required error={fieldError(errors.phone?.message)}>
            <Input id="phone" inputMode="numeric" invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field label={t("initialPassword")} htmlFor="password" required error={fieldError(errors.password?.message)}>
            <PasswordInput id="password" invalid={!!errors.password} {...register("password")} />
          </Field>
          <div className="mt-1 flex justify-end gap-2.5">
            <Button type="button" variant="neutral" onClick={() => setAdding(false)}>{tc("cancel")}</Button>
            <Button type="submit" loading={create.isPending}>{t("add")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
