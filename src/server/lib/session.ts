import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "./env";
import { serverFetch } from "./proxyFetch";

/** SSR auth client (publishable key + cookies). Used ONLY for auth (sign in/out, getUser). */
export async function authClient() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    global: { fetch: serverFetch },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a context where cookies are read-only */
        }
      },
    },
  });
}

export async function authUserId(): Promise<string | null> {
  const supabase = await authClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
