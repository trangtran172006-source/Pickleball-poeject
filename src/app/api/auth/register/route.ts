import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok } from "@/server/lib/http";
import { maskEmail } from "@/server/lib/codes";
import { issueOtp } from "@/server/lib/otp";
import { registerSchema } from "@/shared/schemas/auth";

export async function POST(req: Request) {
  return handler(async () => {
    const input = await body(req, registerSchema);
    const email = input.email.toLowerCase();
    const { data: dup } = await admin().from("nguoi_dung").select("email,so_dien_thoai")
      .or(`email.eq.${email},so_dien_thoai.eq.${input.phone}`);
    if (dup && dup.length > 0) throw fail("ACCOUNT_EXISTS", 409);
    const { data: created, error } = await admin().auth.admin.createUser({
      email, password: input.password, email_confirm: true,
    });
    if (error || !created.user) throw fail("ACCOUNT_EXISTS", 409);
    const year = input.birthYear ? Number(input.birthYear) : null;
    const { error: e2 } = await admin().rpc("fn_tao_khach", {
      p_auth: created.user.id, p_ten: input.fullName, p_email: email,
      p_sdt: input.phone, p_nam: year, p_gioi: input.gender || "",
    });
    if (e2) { await admin().auth.admin.deleteUser(created.user.id); throw e2; }
    const { resendAvailableAt } = await issueOtp(email, "register");
    return ok({ maskedEmail: maskEmail(email), resendAvailableAt });
  });
}
