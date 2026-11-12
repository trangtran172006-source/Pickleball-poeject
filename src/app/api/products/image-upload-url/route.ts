import { body, handler, ok, requireRole } from "@/server/lib/http";
import { signedUpload, uploadTicketSchema } from "@/server/lib/uploads";
export async function POST(req: Request) {
  return handler(async () => {
    await requireRole(["owner"]);
    const meta = await body(req, uploadTicketSchema);
    return ok(await signedUpload("products", "items", meta));
  });
}
