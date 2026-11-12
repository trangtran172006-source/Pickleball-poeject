import { handler, ok, requireRole } from "@/server/lib/http";
import { pricingData } from "@/server/lib/bookings";
import { setPrice } from "@/server/lib/ownerData";
import { z } from "zod";
import { body } from "@/server/lib/http";
export async function GET() {
  return handler(async () => ok((await pricingData()).pricing));
}
const putSchema = z.object({ courtId: z.string(), dayGroup: z.enum(["T2-T6", "T7-CN"]), bandId: z.string(), price: z.number().int().min(0) });
export async function PUT(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const input = await body(req, putSchema);
    await setPrice(input);
    return ok(null);
  });
}
