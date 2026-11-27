import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/server/admin'
import { loadJob, publicJobView } from '@/lib/server/job-token'

// Public: the sub's job link page loads its details here. The link itself is the key.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const job = await loadJob(token)
  if (job instanceof NextResponse) return job

  const supabase = adminClient()
  const now = new Date().toISOString()
  await supabase.from('job_tokens')
    .update({ opened_at: now, opened_count: (job.token.opened_count || 0) + 1 })
    .eq('id', job.token.id)
  if (!job.phase.link_opened_at) {
    await supabase.from('phases').update({ link_opened_at: now }).eq('id', job.phase.id)
  }

  return NextResponse.json(publicJobView(job))
}
