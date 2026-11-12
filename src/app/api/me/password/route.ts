import { z } from "zod";
import { admin } from "@/server/lib/admin";
import { authClient } from "@/server/lib/session";
import { body, fail, handler, noContent, requireUser } from "@/server/lib/http";
import { PASSWORD_PATTERN } from "@/shared/schemas/auth";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().regex(PASSWORD_PATTERN),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"] });

export async function POST(req: Request) {
  return handler(async () => {
    const acc = await requireUser();
    const input = await body(req, schema);
    const supabase = await authClient();
    const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: input.currentPassword });
    if (error) throw fail("WRONG_CURRENT_PASSWORD", 400);
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) throw fail("UNAUTHORIZED", 401);
    const { error: e2 } = await admin().auth.admin.updateUserById(uid, { password: input.newPassword });
    if (e2) throw e2;
    return noContent();
  });
}
