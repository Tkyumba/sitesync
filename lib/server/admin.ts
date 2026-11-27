import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client. Bypasses database rules, so it must only ever run on the
// server, and every caller must check who is allowed to do what first.
let client: SupabaseClient | null = null

export function adminClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return client
}

export const PHOTO_BUCKET = 'phase-photos'
