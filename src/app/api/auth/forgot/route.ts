import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok } from "@/server/lib/http";
import { maskEmail } from "@/server/lib/codes";
import { issueOtp } from "@/server/lib/otp";
import { forgotSchema } from "@/shared/schemas/auth";

export async function POST(req: Request) {
  return handler(async () => {
    const input = await body(req, forgotSchema);
    const email = input.email.toLowerCase();
    const { data: nd } = await admin().from("nguoi_dung").select("ma_nguoi_dung,da_xac_thuc").eq("email", email).maybeSingle();
    if (!nd || !nd.da_xac_thuc) throw fail("ACCOUNT_NOT_FOUND", 404);
    const { resendAvailableAt } = await issueOtp(email, "reset");
    return ok({ maskedEmail: maskEmail(email), resendAvailableAt });
  });
}
