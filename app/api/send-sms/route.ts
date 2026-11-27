import { NextRequest, NextResponse } from 'next/server'
import { requireRole, STAFF_ROLES } from '@/lib/server/auth'
import { sendSms } from '@/lib/server/sms'

// Staff only: without this check anyone could send texts on SiteSync's Twilio account.
export async function POST(req: NextRequest) {
  const auth = await requireRole(STAFF_ROLES)
  if (auth instanceof NextResponse) return auth

  const { to, message } = await req.json()
  if (!to || !message) return NextResponse.json({ error: 'Missing "to" or "message".' }, { status: 400 })

  const result = await sendSms(to, message)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}
