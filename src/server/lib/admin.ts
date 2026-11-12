import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { serverFetch } from "./proxyFetch";

/** Service-role client: bypasses RLS. Used for ALL table/storage/auth-admin ops. */
let _admin: SupabaseClient | null = null;
export function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: serverFetch },
    });
  }
  return _admin;
}
