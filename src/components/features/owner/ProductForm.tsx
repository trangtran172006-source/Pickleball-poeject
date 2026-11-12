"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useApiErrorMessage, useValidationMessage } from "@/lib/apiErrors";
import { productAdminApi } from "@/services/api/owner";
import { uploadToSignedUrl } from "@/services/api/customer";
import type { Product } from "@/shared/types";

const schema = z.object({
  name: z.string().trim().min(1, "required").max(100, "wrongFormat"),
  type: z.enum(["Hàng hóa", "Dịch vụ"]),
  group: z.union([z.enum(["Đồ uống", "Phụ kiện"]), z.literal("")]),
  unit: z.string().trim().min(1, "required").max(20, "wrongFormat"),
  price: z.string().refine((value) => /^\d+$/.test(value) && Number(value) >= 0, "priceInvalid"),
  stock: z.string().refine((value) => value === "" || /^\d+$/.test(value), "quantityInvalid"),
  description: z.string().max(150, "wrongFormat"),
});
type FormValues = z.infer<typeof schema>;

/** UI_48 (add) / UI_49 (edit) – product or service form (UC_7.1 / UC_7.2). */
export function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const errorText = useApiErrorMessage();
  const fieldError = useValidationMessage();
  const toast = useToast();
  const client = useQueryClient();
  const [image, setImage] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? { name: product.name, type: product.type, group: product.group ?? "", unit: product.unit, price: String(product.price), stock: product.stock === null ? "" : String(product.stock), description: product.description ?? "" }
      : { name: "", type: "Hàng hóa", group: "Đồ uống", unit: "", price: "", stock: "", description: "" },
  });
  const type = watch("type");

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      let imagePath: string | undefined;
      if (image) imagePath = await uploadToSignedUrl(await productAdminApi.imageUploadUrl(image), image);
      const payload = {
        name: values.name.trim(),
        unit: values.unit.trim(),
        price: Number(values.price),
        type: values.type,
        group: values.type === "Hàng hóa" ? ((values.group || null) as Product["group"]) : null,
        description: values.description.trim(),
        stock: values.type === "Dịch vụ" || values.stock === "" ? null : Number(values.stock),
        imagePath,
      };
      return product ? productAdminApi.update(product.id, payload) : productAdminApi.create(payload);
    },
    onSuccess: () => {
      toast.show("success", product ? t("updated") : t("created"));
      void client.invalidateQueries({ queryKey: ["products-admin"] });
      void client.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
  });

  return (
    <Modal open onClose={save.isPending ? () => {} : onClose} showClose title={product ? t("editTitle") : t("addTitle")} subtitle={product ? t("editSub") : t("addSub")} widthClass="max-w-[560px]">
      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
        {save.isError && <Banner tone="error" title={errorText(save.error, product ? "errors.updateFailed" : "errors.createFailed")} />}
        <Field label={t("name")} htmlFor="p-name" required error={fieldError(errors.name?.message)}>
          <Input id="p-name" invalid={!!errors.name} {...register("name")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("type")} htmlFor="p-type">
            <Select id="p-type" {...register("type")}>
              <option value="Hàng hóa">{t("typeGoods")}</option>
              <option value="Dịch vụ">{t("typeService")}</option>
            </Select>
          </Field>
          {type === "Hàng hóa" ? (
            <Field label={t("group")} htmlFor="p-group">
              <Select id="p-group" {...register("group")}>
                <option value="Đồ uống">{t("groupDrink")}</option>
                <option value="Phụ kiện">{t("groupAccessory")}</option>
              </Select>
            </Field>
          ) : (
            <div />
          )}
          <Field label={t("unit")} htmlFor="p-unit" required error={fieldError(errors.unit?.message)}>
            <Input id="p-unit" invalid={!!errors.unit} {...register("unit")} />
          </Field>
          <Field label={t("price")} htmlFor="p-price" required error={fieldError(errors.price?.message)}>
            <Input id="p-price" inputMode="numeric" invalid={!!errors.price} right={<span className="mr-3 text-[11px] text-subtle">đ</span>} {...register("price")} />
          </Field>
          {type === "Hàng hóa" && (
            <Field label={t("stock")} htmlFor="p-stock" error={fieldError(errors.stock?.message)}>
              <Input id="p-stock" inputMode="numeric" invalid={!!errors.stock} {...register("stock")} />
            </Field>
          )}
        </div>
        <Field label={t("description")} htmlFor="p-desc" error={fieldError(errors.description?.message)}>
          <Input id="p-desc" maxLength={150} {...register("description")} />
        </Field>
        <div>
          <p className="mb-2 text-xs font-medium text-ink">{t("image")}</p>
          <ImageDropzone file={image} onChange={setImage} disabled={save.isPending} />
        </div>
        <div className="mt-1 flex justify-end gap-2.5">
          <Button variant="neutral" onClick={onClose} disabled={save.isPending}>
            {tc("cancel")}
          </Button>
          <Button type="submit" loading={save.isPending} data-save-product>
            {tc("saveData")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
