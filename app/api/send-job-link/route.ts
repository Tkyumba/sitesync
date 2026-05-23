import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { phaseId, subName, subPhone, subEmail } = await req.json()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sitesync-green.vercel.app'

  // Save to phase
  await supabase.from('phases').update({ 
    sub_name: subName, 
    sub_phone: subPhone || null,
    sub_email: subEmail || null
  }).eq('id', phaseId)

  // Generate magic link token
  const { data: tokenData, error } = await supabase
    .from('job_tokens')
    .insert({ phase_id: phaseId, sub_name: subName, sub_phone: subPhone || 'N/A' })
    .select()
    .single()

  if (error || !tokenData) return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })

  const magicLink = `${appUrl}/job/${tokenData.token}`

  // Get phase + project info
  const { data: phase } = await supabase
    .from('phases')
    .select('*, projects(name, address)')
    .eq('id', phaseId)
    .single()

  const projectName = phase?.projects?.name || 'your project'
  const projectAddress = phase?.projects?.address || ''
  const phaseName = phase?.name || 'your phase'

  // Send email via Resend
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (RESEND_API_KEY && subEmail) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SiteSync <onboarding@resend.dev>',
        to: subEmail,
        subject: `Your job is ready — ${phaseName} on ${projectName}`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#F97316;padding:24px 28px;">
      <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">SiteSync</span>
    </div>
    <div style="padding:32px 28px;">
      <p style="color:#6B7280;font-size:14px;margin:0 0 6px;">Hey ${subName},</p>
      <h1 style="color:#111318;font-size:24px;font-weight:700;margin:0 0 20px;letter-spacing:-0.4px;">Your job is ready 🏗</h1>
      <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:16px 20px;margin-bottom:16px;">
        <p style="color:#C2410C;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 4px;">Your Phase</p>
        <p style="color:#111318;font-size:20px;font-weight:700;margin:0;">${phaseName}</p>
      </div>
      <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="color:#111318;font-size:14px;font-weight:600;margin:0 0 2px;">${projectName}</p>
        <p style="color:#6B7280;font-size:13px;margin:0;">${projectAddress}</p>
      </div>
      <p style="color:#6B7280;font-size:14px;margin:0 0 24px;line-height:1.6;">Tap the button below to view your job details, mark it started when you arrive on site, upload your completion photos, and mark it done — no login needed.</p>
      <a href="${magicLink}" style="display:block;background:#F97316;color:white;text-align:center;padding:16px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;">Open My Job →</a>
      <p style="color:#9CA3AF;font-size:12px;margin:20px 0 0;text-align:center;">This link is unique to you and expires in 7 days.</p>
    </div>
    <div style="background:#F9FAFB;padding:16px 28px;border-top:1px solid #E5E7EB;">
      <p style="color:#9CA3AF;font-size:12px;margin:0;">SiteSync · Built for Legacy Homes of Medina</p>
    </div>
  </div></body></html>`
      })
    })
  }

  // Also try SMS if phone provided
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
  const TWILIO_MESSAGING_SID = process.env.TWILIO_MESSAGING_SID

  if (TWILIO_SID && TWILIO_TOKEN && subPhone) {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: subPhone,
        MessagingServiceSid: TWILIO_MESSAGING_SID || '',
        Body: `SiteSync: Hey ${subName}! Your job "${phaseName}" on ${projectName} is ready. Open it here: ${magicLink}`,
      })
    }).catch(() => {})
  }

  // Log activity
  await supabase.from('activity_log').insert({
    project_id: phase?.project_id,
    phase_id: phaseId,
    action: `Job link sent to ${subName} for "${phaseName}"`,
    actor_name: 'Manager',
    metadata: { sub_name: subName, sub_email: subEmail, sub_phone: subPhone }
  })

  return NextResponse.json({ ok: true, magicLink })
}
