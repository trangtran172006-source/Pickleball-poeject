import { env } from "./env";

/** OTP delivery. In dev (OTP_TRANSPORT=log) the code is printed to the server log. */
export async function sendOtpEmail(email: string, code: string, purpose: "register" | "reset") {
  if (env.otpTransport === "log") {
    console.log(`\n==== OTP (${purpose}) ====\n  to: ${email}\n  code: ${code}\n  (hết hạn sau 3 phút)\n=========================\n`);
    return;
  }
  // SMTP path intentionally not wired until a real Gmail App Password is provided.
  console.warn("[mailer] non-log transport not configured; OTP not sent to", email);
}
