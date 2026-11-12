import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, fail, handler, ok } from "@/server/lib/http";
import { verifyOtp } from "@/server/lib/otp";

const schema = z.object({ email: z.string().email(), purpose: z.enum(["register", "reset"]), code: z.string().regex(/^\d{6}$/) });

export async function POST(req: Request) {
  return handler(async () => {
    const input = await body(req, schema);
    const email = input.email.toLowerCase();
    const token = await verifyOtp(email, input.purpose, input.code);
    if (input.purpose === "register") {
      await admin().from("nguoi_dung").update({ da_xac_thuc: true }).eq("email", email);
      return ok({});
    }
    return ok({ resetToken: token });
  });
}
