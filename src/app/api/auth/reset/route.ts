import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, noContent } from "@/server/lib/http";
import { consumeResetToken } from "@/server/lib/otp";
import { PASSWORD_PATTERN } from "@/shared/schemas/auth";

const schema = z.object({
  password: z.string().regex(PASSWORD_PATTERN),
  confirmPassword: z.string(),
  resetToken: z.string().min(1),
}).refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"] });

export async function POST(req: Request) {
  return handler(async () => {
    const input = await body(req, schema);
    const email = await consumeResetToken(input.resetToken);
    const { data: nd } = await admin().from("nguoi_dung").select("auth_user_id").eq("email", email).maybeSingle();
    if (!nd?.auth_user_id) throw fail("ACCOUNT_NOT_FOUND", 404);
    const { error } = await admin().auth.admin.updateUserById(nd.auth_user_id, { password: input.password });
    if (error) throw error;
    return noContent();
  });
}
