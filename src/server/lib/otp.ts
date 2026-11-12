import { createHash } from "crypto";
import { admin } from "./admin";
import { otpCode, shortId } from "./codes";
import { sendOtpEmail } from "./mailer";
import { fail } from "./http";

const PEPPER = process.env.OTP_PEPPER ?? "picklehead-dev-pepper";
const hash = (code: string) => createHash("sha256").update(code + PEPPER).digest("hex");
const DB_PURPOSE = { register: "Đăng ký", reset: "Quên mật khẩu" } as const;
export type OtpPurpose = keyof typeof DB_PURPOSE;

/** Create a 6-digit OTP (3-min expiry), invalidating prior unused ones, and "send" it. */
export async function issueOtp(email: string, purpose: OtpPurpose) {
  await admin().from("otp").update({ da_su_dung: true })
    .eq("email", email).eq("muc_dich", DB_PURPOSE[purpose]).eq("da_su_dung", false);
  const code = otpCode();
  const expires = new Date(Date.now() + 3 * 60_000);
  await admin().from("otp").insert({
    ma_otp_id: shortId("OT"), email, ma_otp: hash(code),
    muc_dich: DB_PURPOSE[purpose], het_han_luc: expires.toISOString(),
  });
  await sendOtpEmail(email, code, purpose);
  return { resendAvailableAt: expires.toISOString() };
}

/** Verify a code. On reset success returns a one-time reset token; register returns null. */
export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<string | null> {
  const { data } = await admin().from("otp").select("*")
    .eq("email", email).eq("muc_dich", DB_PURPOSE[purpose]).eq("da_su_dung", false)
    .order("ngay_tao", { ascending: false }).limit(1).maybeSingle();
  if (!data) throw fail("OTP_EXPIRED", 400);
  if (new Date(data.het_han_luc) < new Date()) throw fail("OTP_EXPIRED", 400);
  if (data.so_lan_sai >= 5) throw fail("OTP_TOO_MANY", 400);
  if (data.ma_otp !== hash(code)) {
    const fails = data.so_lan_sai + 1;
    await admin().from("otp").update({ so_lan_sai: fails, da_su_dung: fails >= 5 }).eq("ma_otp_id", data.ma_otp_id);
    throw fail(fails >= 5 ? "OTP_TOO_MANY" : "OTP_WRONG", 400);
  }
  if (purpose === "reset") {
    const token = shortId("RT") + Math.random().toString(36).slice(2, 10);
    await admin().from("otp").update({
      da_su_dung: true, reset_token: token, het_han_luc: new Date(Date.now() + 10 * 60_000).toISOString(),
    }).eq("ma_otp_id", data.ma_otp_id);
    return token;
  }
  await admin().from("otp").update({ da_su_dung: true }).eq("ma_otp_id", data.ma_otp_id);
  return null;
}

export async function consumeResetToken(token: string): Promise<string> {
  const { data } = await admin().from("otp").select("ma_otp_id,email,het_han_luc,reset_token")
    .eq("reset_token", token).maybeSingle();
  if (!data || new Date(data.het_han_luc) < new Date()) throw fail("OTP_EXPIRED", 400);
  await admin().from("otp").update({ reset_token: null }).eq("ma_otp_id", data.ma_otp_id);
  return data.email;
}
