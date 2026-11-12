import { handler, ok } from "@/server/lib/http";
import { buildSchedule } from "@/server/lib/bookings";
import { hcmToday } from "@/server/lib/http";
export async function GET(req: Request) {
  return handler(async () => {
    const date = new URL(req.url).searchParams.get("date") || hcmToday();
    return ok(await buildSchedule(date));
  });
}
