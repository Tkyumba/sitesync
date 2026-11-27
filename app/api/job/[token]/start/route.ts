import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/server/admin'
import { loadJob } from '@/lib/server/job-token'

// Public: the sub taps "I'm on site". Only moves this link's phase from not started to in progress.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const job = await loadJob(token)
  if (job instanceof NextResponse) return job

  if (job.phase.status === 'complete') return NextResponse.json({ error: 'This job is already complete.' }, { status: 409 })
  if (job.phase.status === 'in_progress') return NextResponse.json({ ok: true, status: 'in_progress' })

  const supabase = adminClient()
  const { error } = await supabase.from('phases')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', job.phase.id)
  if (error) return NextResponse.json({ error: 'Could not start the job. Please try again.' }, { status: 500 })

  await supabase.from('activity_log').insert({
    project_id: job.phase.project_id,
    phase_id: job.phase.id,
    action: `${job.token.sub_name} started "${job.phase.name}"`,
    actor_name: job.token.sub_name,
  })

  return NextResponse.json({ ok: true, status: 'in_progress' })
}
