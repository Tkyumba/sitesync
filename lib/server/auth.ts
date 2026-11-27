import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { adminClient } from './admin'

export type AppRole = 'owner' | 'vp' | 'manager' | 'sub' | 'inactive'
export const STAFF_ROLES: AppRole[] = ['owner', 'vp', 'manager']

export type Caller = { id: string; name: string; email: string; role: AppRole }

// Who is making this request, based on their login cookie. Returns null when
// nobody is logged in or the login has no SiteSync user record.
export async function getCaller(): Promise<Caller | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { /* read-only context */ }
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await adminClient()
    .from('users').select('id, name, email, role').eq('id', user.id).single()
  if (!profile) return null
  return profile as Caller
}

// Use at the top of a route handler:
//   const auth = await requireRole(STAFF_ROLES); if (auth instanceof NextResponse) return auth
export async function requireRole(roles: AppRole[]): Promise<Caller | NextResponse> {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })
  if (!roles.includes(caller.role)) return NextResponse.json({ error: 'You do not have access to this.' }, { status: 403 })
  return caller
}
