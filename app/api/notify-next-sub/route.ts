import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { completedPhaseId, projectId } = await req.json()

    // Get the completed phase
    const { data: completedPhase } = await supabase
      .from('phases')
      .select('*, projects(name, address)')
      .eq('id', completedPhaseId)
      .single()

    if (!completedPhase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

    // Find the next phase in sequence
    const { data: nextPhase } = await supabase
      .from('phases')
      .select('*, users(name, email)')
      .eq('project_id', projectId)
      .eq('order_index', completedPhase.order_index + 1)
      .single()

    // Get all managers to notify
    const { data: managers } = await supabase
      .from('users')
      .select('name, email')
      .in('role', ['manager', 'vp', 'owner'])

    const projectName = completedPhase.projects?.name || 'Unknown Project'
    const projectAddress = completedPhase.projects?.address || ''

    const results: any = { notified: [] }

    // Notify the next sub if assigned
    if (nextPhase?.users?.email) {
      await sendEmail({
        to: nextPhase.users.email,
        subject: `Your phase is ready — ${projectName}`,
        html: subNotificationEmail({
          subName: nextPhase.users.name,
          phaseName: nextPhase.name,
          prevPhaseName: completedPhase.name,
          projectName,
          projectAddress,
        })
      })
      results.notified.push({ type: 'next_sub', email: nextPhase.users.email })
    }

    // Notify managers
    if (managers) {
      for (const manager of managers) {
        await sendEmail({
          to: manager.email,
          subject: `✓ Phase complete — ${completedPhase.name} on ${projectName}`,
          html: managerNotificationEmail({
            managerName: manager.name,
            phaseName: completedPhase.name,
            projectName,
            projectAddress,
            nextPhaseName: nextPhase?.name,
            nextSubName: nextPhase?.users?.name,
          })
        })
        results.notified.push({ type: 'manager', email: manager.email })
      }
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  // Using Resend — swap with your email provider if different
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL SKIPPED - no RESEND_API_KEY] To: ${to} | Subject: ${subject}`)
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'SiteSync <notifications@sitesync.app>',
      to,
      subject,
      html,
    }),
  })
}

function subNotificationEmail({ subName, phaseName, prevPhaseName, projectName, projectAddress }: any) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0C10;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111318;border:1px solid #1E2128;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:24px 28px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:16px;">🏗</span>
        </div>
        <span style="color:white;font-size:18px;font-weight:700;letter-spacing:-0.3px;">SiteSync</span>
      </div>
    </div>
    <div style="padding:28px;">
      <p style="color:#9CA3AF;font-size:13px;margin:0 0 8px;">Hey ${subName},</p>
      <h1 style="color:#F9FAFB;font-size:22px;font-weight:700;margin:0 0 16px;letter-spacing:-0.4px;">Your phase is ready to start</h1>
      <div style="background:#0A0C10;border:1px solid #1E2128;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 4px;">Project</p>
        <p style="color:#F9FAFB;font-size:15px;font-weight:600;margin:0 0 2px;">${projectName}</p>
        <p style="color:#6B7280;font-size:12px;margin:0;font-family:monospace;">${projectAddress}</p>
      </div>
      <div style="background:#0A1F0A;border:1px solid #166534;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="color:#4ADE80;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 4px;">Your Phase</p>
        <p style="color:#F9FAFB;font-size:18px;font-weight:700;margin:0;">${phaseName}</p>
        <p style="color:#4B5563;font-size:12px;margin:6px 0 0;"><span style="color:#22C55E;">✓ ${prevPhaseName}</span> was just completed — you're up next.</p>
      </div>
      <p style="color:#6B7280;font-size:13px;margin:0 0 20px;">Log in to SiteSync to confirm your start and upload completion photos when done.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sitesync-green.vercel.app'}/jobs" style="display:block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View My Jobs →</a>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #1E2128;">
      <p style="color:#374151;font-size:11px;margin:0;">SiteSync · Built for Legacy Homes of Medina</p>
    </div>
  </div>
</body>
</html>`
}

function managerNotificationEmail({ managerName, phaseName, projectName, projectAddress, nextPhaseName, nextSubName }: any) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0C10;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111318;border:1px solid #1E2128;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:24px 28px;">
      <span style="color:white;font-size:18px;font-weight:700;">SiteSync</span>
    </div>
    <div style="padding:28px;">
      <p style="color:#9CA3AF;font-size:13px;margin:0 0 8px;">Hey ${managerName},</p>
      <h1 style="color:#F9FAFB;font-size:20px;font-weight:700;margin:0 0 16px;">Phase marked complete</h1>
      <div style="background:#0A1F0A;border:1px solid #166534;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="color:#4ADE80;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 4px;">✓ Completed</p>
        <p style="color:#F9FAFB;font-size:16px;font-weight:700;margin:0;">${phaseName}</p>
        <p style="color:#6B7280;font-size:12px;margin:4px 0 0;font-family:monospace;">${projectName} · ${projectAddress}</p>
      </div>
      ${nextPhaseName ? `
      <div style="background:#0F1929;border:1px solid #1D4ED8;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="color:#60A5FA;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 4px;">▸ Next Phase</p>
        <p style="color:#F9FAFB;font-size:16px;font-weight:700;margin:0;">${nextPhaseName}</p>
        ${nextSubName ? `<p style="color:#6B7280;font-size:12px;margin:4px 0 0;">${nextSubName} has been notified.</p>` : `<p style="color:#EF4444;font-size:12px;margin:4px 0 0;">⚠ No subcontractor assigned to this phase yet.</p>`}
      </div>` : `<div style="background:#1A1C22;border:1px solid #374151;border-radius:12px;padding:14px 18px;margin-bottom:16px;"><p style="color:#6B7280;font-size:13px;margin:0;">This was the final phase on this project.</p></div>`}
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://sitesync-green.vercel.app'}/dashboard" style="display:block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px;">View Dashboard →</a>
    </div>
  </div>
</body>
</html>`
}
