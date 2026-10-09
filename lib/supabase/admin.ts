import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/supabase/env";

/**
 * Privileged Supabase client using the SERVICE ROLE key — bypasses RLS.
 * ONLY import this from server-side code (Route Handlers, Server Actions,
 * webhooks). The `server-only` import guarantees it can never reach the client.
 */
export function createAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
