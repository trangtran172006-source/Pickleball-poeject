import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, handler, ok, requireUser } from "@/server/lib/http";
import { buildMe } from "@/server/lib/me";
import { GENDERS } from "@/shared/schemas/auth";

export async function GET() {
  return handler(async () => {
    const acc = await requireUser();
    return ok(await buildMe(acc.ma_nguoi_dung));
  });
}

const patchSchema = z.object({
  fullName: z.string().trim().min(1).max(70),
  birthDate: z.string().nullable(),
  gender: z.union([z.enum(GENDERS), z.null()]),
  avatarPath: z.string().optional(),
});

export async function PATCH(req: Request) {
  return handler(async () => {
    const acc = await requireUser();
    const input = await body(req, patchSchema);
    const patch: Record<string, unknown> = {
      ho_ten: input.fullName,
      ngay_sinh: input.birthDate || null,
      gioi_tinh: input.gender,
    };
    if (input.avatarPath) patch.anh_dai_dien = input.avatarPath;
    await admin().from("nguoi_dung").update(patch).eq("ma_nguoi_dung", acc.ma_nguoi_dung);
    return ok(await buildMe(acc.ma_nguoi_dung));
  });
}
