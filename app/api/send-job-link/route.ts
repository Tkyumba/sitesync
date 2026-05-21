import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { phaseId, subName, subPhone } = await req.json()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sitesync-green.vercel.app'

  // Save name/phone to phase
  await supabase.from('phases').update({ sub_name: subName, sub_phone: subPhone }).eq('id', phaseId)

  // Generate magic link token
  const { data: tokenData, error } = await supabase
    .from('job_tokens')
    .insert({ phase_id: phaseId, sub_name: subName, sub_phone: subPhone })
    .select()
    .single()

  if (error || !tokenData) return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })

  const magicLink = `${appUrl}/job/${tokenData.token}`

  // Get phase + project info for the message
  const { data: phase } = await supabase
    .from('phases')
    .select('*, projects(name, address)')
    .eq('id', phaseId)
    .single()

  const projectName = phase?.projects?.name || 'your project'
  const projectAddress = phase?.projects?.address || ''
  const phaseName = phase?.name || 'your phase'

  const smsBody = `SiteSync: Hey ${subName}! You've been assigned to "${phaseName}" on ${projectName} (${projectAddress}). Tap your job link to get started: ${magicLink}`

  // Send SMS
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
  const TWILIO_MESSAGING_SID = process.env.TWILIO_MESSAGING_SID

  if (TWILIO_SID && TWILIO_TOKEN) {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: subPhone,
        MessagingServiceSid: TWILIO_MESSAGING_SID || '',
        Body: smsBody,
      })
    })
  } else {
    console.log(`[SMS SKIPPED] To: ${subPhone} | ${smsBody}`)
  }

  return NextResponse.json({ ok: true, magicLink })
}
