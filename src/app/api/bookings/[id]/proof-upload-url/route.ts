import { body, handler, ok, requireUser } from "@/server/lib/http";
import { signedUpload, uploadTicketSchema } from "@/server/lib/uploads";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handler(async () => {
    await requireUser();
    const { id } = await params;
    const meta = await body(req, uploadTicketSchema);
    return ok(await signedUpload("payment-proofs", id, meta));
  });
}
