import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { to, message } = await req.json()

  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
  const TWILIO_MESSAGING_SID = process.env.TWILIO_MESSAGING_SID

  if (!TWILIO_SID || !TWILIO_TOKEN) {
    console.log(`[SMS SKIPPED] To: ${to} | Message: ${message}`)
    return NextResponse.json({ ok: true, skipped: true })
  }

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      MessagingServiceSid: TWILIO_MESSAGING_SID || '',
      Body: message,
    })
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.message }, { status: 400 })
  return NextResponse.json({ ok: true, sid: data.sid })
}
