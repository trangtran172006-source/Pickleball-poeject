import { handler, ok, requireRole } from "@/server/lib/http";
import { productReport } from "@/server/lib/reports";
import type { ReportPeriod } from "@/shared/types";
export async function GET(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const sp = new URL(req.url).searchParams;
    return ok(await productReport((sp.get("period") as ReportPeriod) || "day", sp.get("date") || undefined, sp.get("from") || undefined, sp.get("to") || undefined));
  });
}
