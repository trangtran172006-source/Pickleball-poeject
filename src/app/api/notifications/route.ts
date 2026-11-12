import { admin } from "@/server/lib/admin";
import { handler, ok, requireUser } from "@/server/lib/http";
export async function GET() {
  return handler(async () => {
    const acc = await requireUser();
    const { data } = await admin().from("thong_bao").select("*")
      .eq("ma_nguoi_dung", acc.ma_nguoi_dung).order("thoi_gian", { ascending: false }).limit(50);
    const items = (data ?? []).map((n) => ({
      id: n.ma_thong_bao, type: n.loai, params: n.tham_so ?? {}, bookingId: n.ma_dat_san ?? null,
      createdAt: n.thoi_gian, read: n.da_doc,
    }));
    return ok({ unread: items.filter((i) => !i.read).length, items });
  });
}
