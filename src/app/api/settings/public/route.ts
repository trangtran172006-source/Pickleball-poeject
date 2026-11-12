import { admin } from "@/server/lib/admin";
import { handler, ok } from "@/server/lib/http";
export async function GET() {
  return handler(async () => {
    const { data } = await admin().from("cau_hinh").select("hotline").maybeSingle();
    return ok({ hotline: data?.hotline ?? "", mapUrl: "" });
  });
}
