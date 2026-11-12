import { admin } from "./admin";
import { currentShift } from "./http";
import type { Me } from "@/shared/types";

/** Builds the Me contract for a given account id (used by /api/me and shift check-in). */
export async function buildMe(ma: string): Promise<Me> {
  const { data: nd } = await admin().from("nguoi_dung")
    .select("ma_nguoi_dung,vai_tro,ho_ten,email,so_dien_thoai,gioi_tinh,ngay_sinh,anh_dai_dien,dang_nhap_gan_nhat")
    .eq("ma_nguoi_dung", ma).single();
  if (!nd) throw new Error("NOT_FOUND");

  let staffCode: string | null | undefined;
  let birthYear: number | null = null;
  if (nd.vai_tro === "staff") {
    const { data } = await admin().from("nhan_vien").select("ma_nhan_vien").eq("ma_nguoi_dung", ma).maybeSingle();
    staffCode = data?.ma_nhan_vien ?? null;
  } else if (nd.vai_tro === "customer") {
    const { data } = await admin().from("khach_hang").select("nam_sinh").eq("ma_nguoi_dung", ma).maybeSingle();
    birthYear = data?.nam_sinh ?? null;
  }

  let shift: Me["shift"] = null;
  if (nd.vai_tro === "staff") {
    const s = await currentShift(ma);
    if (s) shift = { name: s.name, start: s.start, end: s.end, checkedIn: s.checkedIn };
  }

  let avatarUrl: string | null = null;
  if (nd.anh_dai_dien) {
    const { data } = await admin().storage.from("avatars").createSignedUrl(nd.anh_dai_dien, 3600);
    avatarUrl = data?.signedUrl ?? null;
  }

  return {
    id: nd.ma_nguoi_dung,
    role: nd.vai_tro,
    fullName: nd.ho_ten,
    email: nd.email,
    phone: nd.so_dien_thoai,
    birthDate: nd.ngay_sinh ?? null,
    birthYear,
    gender: nd.gioi_tinh ?? null,
    avatarUrl,
    lastLoginAt: nd.dang_nhap_gan_nhat ?? null,
    staffCode,
    shift,
  };
}
