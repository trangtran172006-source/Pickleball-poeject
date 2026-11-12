import { admin } from "@/server/lib/admin";
import { handler, noContent, requireUser } from "@/server/lib/http";
export async function POST() {
  return handler(async () => {
    const acc = await requireUser();
    await admin().from("thong_bao").update({ da_doc: true }).eq("ma_nguoi_dung", acc.ma_nguoi_dung).eq("da_doc", false);
    return noContent();
  });
}
