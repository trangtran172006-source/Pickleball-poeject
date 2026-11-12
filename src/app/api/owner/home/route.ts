import { handler, ok, requireRole } from "@/server/lib/http";
import { ownerHome } from "@/server/lib/home";
export async function GET() { return handler(async () => { await requireRole(["owner"]); return ok(await ownerHome()); }); }
