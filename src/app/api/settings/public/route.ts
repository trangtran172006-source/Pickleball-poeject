import { admin } from "@/server/lib/admin";
import { handler, ok } from "@/server/lib/http";
const DEFAULT_MAP_URL = "https://www.google.com/maps/search/?api=1&query=84+Ch%E1%BA%BF+Lan+Vi%C3%AAn,+Ng%C5%A9+H%C3%A0nh+S%C6%A1n,+%C4%90%C3%A0+N%E1%BA%B5ng";
export async function GET() {
  return handler(async () => {
    const { data } = await admin().from("cau_hinh").select("hotline").maybeSingle();
    return ok({ hotline: data?.hotline ?? "0905123456", mapUrl: DEFAULT_MAP_URL });
  });
}
