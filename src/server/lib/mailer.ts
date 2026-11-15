import nodemailer from "nodemailer";
import { admin } from "./admin";
import { env } from "./env";

async function resolveSmtpCredentials(): Promise<{ host: string; port: number; user: string; pass: string; from: string } | null> {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? "465");
  let user = process.env.SMTP_USER?.trim() ?? "";
  let pass = process.env.SMTP_PASS?.replace(/\s+/g, "") ?? "";

  if (!user || !pass) {
    const { data } = await admin().from("cau_hinh").select("smtp_user,smtp_pass").eq("id", true).maybeSingle();
    if (data?.smtp_user && data?.smtp_pass) {
      user = String(data.smtp_user).trim();
      pass = String(data.smtp_pass).replace(/\s+/g, "");
    }
  }

  if (!user || !pass) return null;
  const from = process.env.SMTP_FROM?.trim() || `"Picklehead Booking" <${user}>`;
  return { host, port, user, pass, from };
}

/**
 * Automatically delivers the 6-digit OTP code to the user's email.
 * 1. Uses SMTP (Gmail App Password / custom SMTP via env or `cau_hinh` table) when configured.
 * 2. Uses Resend HTTP API when `RESEND_API_KEY` is configured.
 * 3. Falls back to Supabase Auth's built-in OTP email delivery (`signInWithOtp`) + server log.
 */
export async function sendOtpEmail(email: string, code: string, purpose: "register" | "reset") {
  const subject =
    purpose === "reset"
      ? `[Picklehead Booking] Mã OTP đặt lại mật khẩu: ${code}`
      : `[Picklehead Booking] Mã OTP xác thực tài khoản: ${code}`;

  const actionLabel = purpose === "reset" ? "đặt lại mật khẩu" : "xác thực tài khoản";
  const text = [
    `Xin chào,`,
    ``,
    `Mã xác thực OTP để ${actionLabel} tại Picklehead Booking của bạn là: ${code}`,
    `Mã có hiệu lực trong vòng 3 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`,
    ``,
    `Trân trọng,`,
    `Picklehead Booking – My Khe Beach Pickleball Club`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; color: #111827;">
      <h2 style="margin: 0 0 12px; color: #1a6c2e;">Picklehead Booking</h2>
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
        Bạn vừa yêu cầu mã xác thực OTP để <strong>${actionLabel}</strong> cho tài khoản <strong>${email}</strong>.
      </p>
      <div style="margin: 20px 0; padding: 16px; background: #edf7f0; border-radius: 8px; text-align: center;">
        <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #1a6c2e;">${code}</span>
      </div>
      <p style="margin: 0 0 8px; font-size: 13px; color: #4b5563;">
        Mã OTP có hiệu lực trong vòng <strong>3 phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        Picklehead Booking · 84 Chế Lan Viên, Mỹ An, Ngũ Hành Sơn, Đà Nẵng
      </p>
    </div>
  `;

  // 1. Try SMTP (Nodemailer) if credentials exist in env or DB (`cau_hinh`)
  try {
    const smtp = await resolveSmtpCredentials();
    if (smtp) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
      });
      await transporter.sendMail({
        from: smtp.from,
        to: email,
        subject,
        text,
        html,
      });
      return;
    }
  } catch (err) {
    console.error("[mailer] SMTP send failed:", err);
  }

  // 2. Try Resend API if RESEND_API_KEY is configured
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const from = process.env.EMAIL_FROM?.trim() || "Picklehead Booking <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [email], subject, text, html }),
      });
      if (res.ok) return;
      console.error("[mailer] Resend failed:", await res.text());
    } catch (err) {
      console.error("[mailer] Resend error:", err);
    }
  }

  // 3. Fallback: trigger Supabase Auth's built-in email OTP + log to server console
  try {
    await admin().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
  } catch (err) {
    console.warn("[mailer] Supabase signInWithOtp fallback warning:", err);
  }

  if (env.otpTransport === "log") {
    console.log(`\n==== OTP (${purpose}) ====\n  to: ${email}\n  code: ${code}\n  (hết hạn sau 3 phút)\n=========================\n`);
  }
}
