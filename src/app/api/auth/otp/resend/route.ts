import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok } from "@/server/lib/http";
import { maskEmail } from "@/server/lib/codes";
import { issueOtp } from "@/server/lib/otp";

const schema = z.object({ email: z.string().email(), purpose: z.enum(["register", "reset"]) });

export async function POST(req: Request) {
  return handler(async () => {
    const input = await body(req, schema);
    const email = input.email.toLowerCase();
    const { data: nd } = await admin().from("nguoi_dung").select("ma_nguoi_dung").eq("email", email).maybeSingle();
    if (!nd) throw fail("ACCOUNT_NOT_FOUND", 404);
    const { resendAvailableAt } = await issueOtp(email, input.purpose);
    return ok({ maskedEmail: maskEmail(email), resendAvailableAt });
  });
}
