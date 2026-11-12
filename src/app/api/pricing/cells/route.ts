import { handler, ok, requireRole } from "@/server/lib/http";
import { priceCells } from "@/server/lib/ownerData";
export async function GET() { return handler(async () => { await requireRole(["owner"]); return ok(await priceCells()); }); }
