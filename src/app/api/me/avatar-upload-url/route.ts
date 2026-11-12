import { handler, ok, requireUser } from "@/server/lib/http";
import { signedUpload, uploadTicketSchema } from "@/server/lib/uploads";
import { body } from "@/server/lib/http";

export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireUser();
    const meta = await body(req, uploadTicketSchema);
    return ok(await signedUpload("avatars", `${acc.ma_nguoi_dung}`, meta));
  });
}
