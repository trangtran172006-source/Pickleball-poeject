import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { admin } from "./admin";
import { authUserId } from "./session";

export type Role = "customer" | "staff" | "owner";
export type Account = {
  ma_nguoi_dung: string;
  vai_tro: Role;
  ho_ten: string;
  email: string;
  so_dien_thoai: string;
  trang_thai_tai_khoan: string;
  shift?: { ma_ca_lam: string; name: string; start: string; end: string; checkedIn: boolean } | null;
};

/** Thrown anywhere in a handler; caught by `handler()` and turned into the error envelope. */
export class HttpError extends Error {
  constructor(public code: string, public status = 400, public fields?: Record<string, string>) {
    super(code);
  }
}
export const fail = (code: string, status = 400, fields?: Record<string, string>) => new HttpError(code, status, fields);

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** Wraps a route body: catches HttpError / ZodError / unknown into { error:{code,fields} }. */
export function handler(fn: () => Promise<Response>): Promise<Response> {
  return fn().catch((e) => {
    if (e instanceof HttpError) {
      return NextResponse.json({ error: { code: e.code, fields: e.fields } }, { status: e.status });
    }
    if (e instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of e.issues) fields[issue.path.join(".") || "_"] = issue.message;
      return NextResponse.json({ error: { code: "VALIDATION", fields } }, { status: 422 });
    }
    // DB functions raise exception '<CODE>' (errcode P0001); map to the UI's known codes.
    const msg = (e as { message?: string })?.message ?? "";
    const m = msg.match(/\b(SLOT_TAKEN|HOLD_EXPIRED|COURT_CLOSED|MIN_DURATION|PAST_DATE|OUT_OF_STOCK|NOT_CANCELLABLE|PRODUCT_NOT_FOUND|DURATION_MISMATCH|PRICE_MISMATCH|NO_PRICE|EMPTY|NOT_FOUND|FORBIDDEN)\b/);
    if (m) {
      const map: Record<string, string> = {
        SLOT_TAKEN: "SLOT_TAKEN", HOLD_EXPIRED: "HOLD_EXPIRED", COURT_CLOSED: "COURT_CLOSED",
        PAST_DATE: "PAST_DATE", OUT_OF_STOCK: "OUT_OF_STOCK", MIN_DURATION: "SLOT_INVALID",
        NOT_CANCELLABLE: "CANCEL_NOT_ALLOWED", PRODUCT_NOT_FOUND: "ORDER_FAILED",
        DURATION_MISMATCH: "SLOT_INVALID", PRICE_MISMATCH: "SLOT_INVALID", EMPTY: "SLOT_INVALID",
        NO_PRICE: "INTERNAL", NOT_FOUND: "BOOKING_NOT_FOUND", FORBIDDEN: "FORBIDDEN",
      };
      const code = map[m[1]] ?? "INTERNAL";
      return NextResponse.json({ error: { code } }, { status: code === "FORBIDDEN" ? 403 : 400 });
    }
    console.error("[api] unhandled", e);
    return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
  });
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    raw = {};
  }
  return schema.parse(raw);
}

/** Loads the signed-in account (and staff shift status). Throws UNAUTHORIZED if none. */
export async function requireUser(): Promise<Account> {
  const uid = await authUserId();
  if (!uid) throw fail("UNAUTHORIZED", 401);
  const { data } = await admin()
    .from("nguoi_dung")
    .select("ma_nguoi_dung,vai_tro,ho_ten,email,so_dien_thoai,trang_thai_tai_khoan")
    .eq("auth_user_id", uid)
    .maybeSingle();
  if (!data) throw fail("UNAUTHORIZED", 401);
  if (data.trang_thai_tai_khoan === "Khóa") throw fail("ACCOUNT_LOCKED", 403);
  const acc = data as Account;
  if (acc.vai_tro === "staff") acc.shift = await currentShift(acc.ma_nguoi_dung);
  return acc;
}

export async function requireRole(roles: Role[]): Promise<Account> {
  const acc = await requireUser();
  if (!roles.includes(acc.vai_tro)) throw fail("FORBIDDEN", 403);
  return acc;
}

/** Staff must have today's shift, within its window, and checked in. Owner bypasses. */
export async function requireShift(acc: Account): Promise<Account> {
  if (acc.vai_tro === "owner") return acc;
  if (acc.vai_tro !== "staff") throw fail("FORBIDDEN", 403);
  if (!acc.shift || !acc.shift.checkedIn) throw fail("SHIFT_REQUIRED", 403);
  return acc;
}

/** The staff member's shift whose time window contains "now" (HCM), with check-in state. */
export async function currentShift(ma_nguoi_dung: string) {
  const today = hcmToday();
  const { data } = await admin()
    .from("dang_ky_ca_lam")
    .select("ma_ca_lam,ngay_lam_viec,gio_bat_dau_ca,gio_ket_thuc_ca,ten_ca")
    .eq("ma_nguoi_dung", ma_nguoi_dung)
    .eq("ngay_lam_viec", today);
  const now = hcmClock();
  const row = (data ?? []).find((s) => s.gio_bat_dau_ca <= now && now < s.gio_ket_thuc_ca);
  if (!row) return null;
  const { data: li } = await admin()
    .from("lich_su_ca_lam")
    .select("ma_lich_su_ca")
    .eq("ma_ca_lam", row.ma_ca_lam)
    .limit(1);
  return {
    ma_ca_lam: row.ma_ca_lam,
    name: row.ten_ca,
    start: (row.gio_bat_dau_ca as string).slice(0, 5),
    end: (row.gio_ket_thuc_ca as string).slice(0, 5),
    checkedIn: (li ?? []).length > 0,
  };
}

/** Today's date (YYYY-MM-DD) in Asia/Ho_Chi_Minh. */
export function hcmToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}
/** Current wall clock HH:MM:SS in Asia/Ho_Chi_Minh. */
export function hcmClock(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date());
}
