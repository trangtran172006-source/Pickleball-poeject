import { body, handler, ok, requireRole } from "@/server/lib/http";
import { signedUpload, uploadTicketSchema } from "@/server/lib/uploads";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireRole(["owner"]);
    const { id } = await params;
    const meta = await body(req, uploadTicketSchema);
    return ok(await signedUpload("refund-proofs", id, meta));
  });
}
