import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { name, email, trade, tempPassword } = await req.json()

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.log(`[INVITE SKIPPED] Would email ${email}`)
    return NextResponse.json({ ok: true, skipped: true })
  }

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0C10;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111318;border:1px solid #1E2128;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:24px 28px;">
      <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">SiteSync</span>
      <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:4px 0 0;">Built for Legacy Homes of Medina</p>
    </div>
    <div style="padding:28px;">
      <h1 style="color:#F9FAFB;font-size:22px;font-weight:700;margin:0 0 8px;letter-spacing:-0.4px;">You've been added to SiteSync</h1>
      <p style="color:#9CA3AF;font-size:14px;margin:0 0 24px;">Hey ${name}, your account is ready. You'll use SiteSync to receive job assignments, mark phases complete, and upload completion photos directly from your phone.</p>
      
      <div style="background:#0A0C10;border:1px solid #1E2128;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 10px;">Your Login</p>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="color:#9CA3AF;font-size:13px;">Email</span>
          <span style="color:#F9FAFB;font-size:13px;font-family:monospace;">${email}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#9CA3AF;font-size:13px;">Temp password</span>
          <span style="color:#F97316;font-size:13px;font-family:monospace;font-weight:700;">${tempPassword}</span>
        </div>
      </div>

      ${trade ? `<p style="color:#6B7280;font-size:13px;margin:0 0 20px;">You're registered as: <strong style="color:#60A5FA;">${trade}</strong></p>` : ''}

      <p style="color:#4B5563;font-size:12px;margin:0 0 20px;">Change your password after your first login. You'll be notified by email whenever a job is assigned to you.</p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sitesync-green.vercel.app'}/login" style="display:block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Log In to SiteSync →</a>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #1E2128;">
      <p style="color:#374151;font-size:11px;margin:0;">Questions? Contact your manager directly.</p>
    </div>
  </div>
</body>
</html>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SiteSync <onboarding@resend.dev>',
      to: email,
      subject: `You're on SiteSync — ${name}`,
      html
    })
  })

  return NextResponse.json({ ok: true })
}
