import 'server-only'

// Sends a text through Twilio. Quietly skips when Twilio isn't configured.
export async function sendSms(to: string, message: string): Promise<{ ok: boolean; skipped?: boolean; error?: string; sid?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const messagingSid = process.env.TWILIO_MESSAGING_SID
  if (!sid || !token) {
    console.log(`[SMS SKIPPED] To: ${to}`)
    return { ok: true, skipped: true }
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, MessagingServiceSid: messagingSid || '', Body: message }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.message }
    return { ok: true, sid: data.sid }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
