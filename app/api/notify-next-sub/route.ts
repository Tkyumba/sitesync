import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { completedPhaseId, projectId, scheduledTime } = await req.json()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sitesync-green.vercel.app'

    const { data: completedPhase } = await supabase
      .from('phases')
      .select('*, projects(name, address)')
      .eq('id', completedPhaseId)
      .single()

    if (!completedPhase) return NextResponse.json({ error: 'Phase not found' }, { status: 404 })

    // Get next phase
    const { data: nextPhase } = await supabase
      .from('phases')
      .select('*, users(name, email, phone)')
      .eq('project_id', projectId)
      .eq('order_index', completedPhase.order_index + 1)
      .single()

    const { data: managers } = await supabase
      .from('users')
      .select('name, email, phone')
      .in('role', ['manager', 'vp', 'owner'])

    const projectName = completedPhase.projects?.name || 'Unknown Project'
    const projectAddress = completedPhase.projects?.address || ''
    const results: any = { notified: [] }

    // Notify next sub via magic link SMS
    if (nextPhase) {
      const subPhone = nextPhase.sub_phone || nextPhase.users?.phone
      const subName = nextPhase.sub_name || nextPhase.users?.name

      if (subPhone && subName) {
        // Generate magic link token
        const { data: tokenData } = await supabase
          .from('job_tokens')
          .insert({ phase_id: nextPhase.id, sub_name: subName, sub_phone: subPhone })
          .select()
          .single()

        if (tokenData) {
          const magicLink = `${appUrl}/job/${tokenData.token}`
          const timeMsg = scheduledTime ? ` Start: ${scheduledTime}.` : ''
          const smsBody = `SiteSync: Hey ${subName}! ${completedPhase.name} is done on ${projectName}.${timeMsg} Your job "${nextPhase.name}" is ready. Tap to view: ${magicLink}`

          await sendSMS(subPhone, smsBody, appUrl)
          results.notified.push({ type: 'sms_magic_link', phone: subPhone, link: magicLink })
        }
      }

      // Also email if they have an account
      if (nextPhase.users?.email) {
        await sendEmail({
          to: nextPhase.users.email,
          subject: `Your phase is ready — ${projectName}`,
          html: subEmailHtml({ subName: nextPhase.users.name, phaseName: nextPhase.name, prevPhaseName: completedPhase.name, projectName, projectAddress, scheduledTime, appUrl })
        })
      }
    }

    // Notify managers
    if (managers) {
      for (const manager of managers) {
        if (manager.phone) {
          const sms = `SiteSync: ✓ ${completedPhase.name} done on ${projectName}. ${nextPhase ? `Next: ${nextPhase.name}${nextPhase.sub_name || nextPhase.users?.name ? ` — ${nextPhase.sub_name || nextPhase.users?.name} notified` : ' — UNASSIGNED'}` : 'Final phase!'}`
          await sendSMS(manager.phone, sms, appUrl)
        }
        if (manager.email) {
          await sendEmail({
            to: manager.email,
            subject: `✓ Phase complete — ${completedPhase.name} on ${projectName}`,
            html: managerEmailHtml({ managerName: manager.name, phaseName: completedPhase.name, projectName, projectAddress, nextPhaseName: nextPhase?.name, nextSubName: nextPhase?.sub_name || nextPhase?.users?.name, scheduledTime, appUrl })
          })
        }
        results.notified.push({ type: 'manager', name: manager.name })
      }
    }

    // Log activity
    await supabase.from('activity_log').insert({
      project_id: projectId,
      phase_id: completedPhaseId,
      action: `Phase "${completedPhase.name}" marked complete`,
      actor_name: 'Subcontractor',
      metadata: { next_phase: nextPhase?.name, notified: results.notified.length }
    })

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function sendSMS(to: string, message: string, appUrl: string) {
  await fetch(`${appUrl}/api/send-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message })
  }).catch(() => {})
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) { console.log(`[EMAIL SKIPPED] To: ${to}`); return }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'SiteSync <onboarding@resend.dev>', to, subject, html })
  })
}

function subEmailHtml({ subName, phaseName, prevPhaseName, projectName, projectAddress, scheduledTime, appUrl }: any) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0C10;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111318;border:1px solid #1E2128;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:24px 28px;"><span style="color:white;font-size:18px;font-weight:700;">SiteSync</span></div>
    <div style="padding:28px;">
      <h1 style="color:#F9FAFB;font-size:22px;font-weight:700;margin:0 0 16px;">Your phase is ready, ${subName}</h1>
      <div style="background:#0A1F0A;border:1px solid #166534;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="color:#4ADE80;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">Your Phase</p>
        <p style="color:#F9FAFB;font-size:18px;font-weight:700;margin:0;">${phaseName}</p>
        <p style="color:#4B5563;font-size:12px;margin:6px 0 0;"><span style="color:#22C55E;">✓ ${prevPhaseName}</span> just completed.</p>
        ${scheduledTime ? `<p style="color:#F97316;font-size:13px;font-weight:600;margin:8px 0 0;">⏰ ${scheduledTime}</p>` : ''}
      </div>
      <p style="color:#6B7280;font-size:12px;margin:0 0 2px;font-family:monospace;">${projectName} · ${projectAddress}</p>
      <a href="${appUrl}/jobs" style="display:block;margin-top:20px;background:linear-gradient(135deg,#F97316,#EA580C);color:white;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:600;">View My Jobs →</a>
    </div>
  </div></body></html>`
}

function managerEmailHtml({ managerName, phaseName, projectName, projectAddress, nextPhaseName, nextSubName, scheduledTime, appUrl }: any) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0C10;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111318;border:1px solid #1E2128;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:24px 28px;"><span style="color:white;font-size:18px;font-weight:700;">SiteSync</span></div>
    <div style="padding:28px;">
      <h1 style="color:#F9FAFB;font-size:20px;font-weight:700;margin:0 0 16px;">Phase complete ✓</h1>
      <div style="background:#0A1F0A;border:1px solid #166534;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="color:#4ADE80;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">✓ Completed</p>
        <p style="color:#F9FAFB;font-size:16px;font-weight:700;margin:0;">${phaseName}</p>
        <p style="color:#6B7280;font-size:12px;margin:4px 0 0;font-family:monospace;">${projectName} · ${projectAddress}</p>
      </div>
      ${nextPhaseName ? `<div style="background:#0F1929;border:1px solid #1D4ED8;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <p style="color:#60A5FA;font-size:11px;font-weight:600;text-transform:uppercase;margin:0 0 4px;">▸ Next</p>
        <p style="color:#F9FAFB;font-size:16px;font-weight:700;margin:0;">${nextPhaseName}</p>
        ${nextSubName ? `<p style="color:#6B7280;font-size:12px;margin:4px 0 0;">${nextSubName} has been notified${scheduledTime ? ` — ${scheduledTime}` : ''}.</p>` : `<p style="color:#EF4444;font-size:12px;margin:4px 0 0;">⚠ No sub assigned.</p>`}
      </div>` : `<p style="color:#6B7280;font-size:13px;">Final phase complete!</p>`}
      <a href="${appUrl}/dashboard" style="display:block;background:linear-gradient(135deg,#F97316,#EA580C);color:white;text-align:center;padding:13px;border-radius:10px;text-decoration:none;font-weight:600;">View Dashboard →</a>
    </div>
  </div></body></html>`
}
