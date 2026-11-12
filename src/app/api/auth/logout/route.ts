import { authClient } from "@/server/lib/session";
import { handler, noContent } from "@/server/lib/http";

export async function POST() {
  return handler(async () => {
    const supabase = await authClient();
    await supabase.auth.signOut();
    return noContent();
  });
}
