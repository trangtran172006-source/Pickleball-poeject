import { admin } from "@/server/lib/admin";
import { authClient } from "@/server/lib/session";
import { body, fail, handler, ok } from "@/server/lib/http";
import { loginSchema } from "@/shared/schemas/auth";

export async function POST(req: Request) {
  return handler(async () => {
    const input = await body(req, loginSchema);
    const email = input.email.trim().toLowerCase();
    const supabase = await authClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (error || !data.user) throw fail("LOGIN_FAILED", 401);
    const { data: nd } = await admin().from("nguoi_dung")
      .select("ma_nguoi_dung,vai_tro,da_xac_thuc,trang_thai_tai_khoan")
      .eq("auth_user_id", data.user.id).maybeSingle();
    if (!nd) { await supabase.auth.signOut(); throw fail("LOGIN_FAILED", 401); }
    if (!nd.da_xac_thuc) { await supabase.auth.signOut(); throw fail("NOT_VERIFIED", 403); }
    if (nd.trang_thai_tai_khoan === "Khóa") { await supabase.auth.signOut(); throw fail("ACCOUNT_LOCKED", 403); }
    await admin().from("nguoi_dung").update({ dang_nhap_gan_nhat: new Date().toISOString() }).eq("ma_nguoi_dung", nd.ma_nguoi_dung);
    const redirect = nd.vai_tro === "owner" ? "/owner" : nd.vai_tro === "staff" ? "/staff/shift" : "/customer";
    return ok({ role: nd.vai_tro, redirect });
  });
}
