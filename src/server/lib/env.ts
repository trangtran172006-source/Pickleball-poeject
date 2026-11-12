/** Server-only environment access. Never import from client components. */
function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
export const env = {
  supabaseUrl: need("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseSecretKey: need("SUPABASE_SECRET_KEY"),
  otpTransport: process.env.OTP_TRANSPORT ?? "log",
  bank: {
    name: process.env.BANK_NAME ?? "Techcombank",
    bin: process.env.BANK_BIN ?? "970407",
    account: process.env.BANK_ACCOUNT ?? "",
    holder: process.env.BANK_HOLDER ?? "",
    hotline: process.env.SUPPORT_HOTLINE ?? "",
  },
};
