import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { body, handler, ok, requireRole } from "@/server/lib/http";
import { bankGet } from "@/server/lib/ownerData";
export async function GET() { return handler(async () => { await requireRole(["owner"]); return ok(await bankGet()); }); }
const schema = z.object({ bankName: z.string().min(1), bankBin: z.string().regex(/^\d{6}$/), holder: z.string().min(1), account: z.string().regex(/^\d{6,20}$/), hotline: z.string().regex(/^0\d{9}$/) });
export async function PUT(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const i = await body(req, schema);
    await admin().from("cau_hinh").upsert({ id: true, ngan_hang: i.bankName, ma_bin: i.bankBin, chu_tai_khoan: i.holder, so_tai_khoan: i.account, hotline: i.hotline });
    return ok(await bankGet());
  });
}
