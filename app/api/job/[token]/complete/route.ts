import { NextRequest, NextResponse } from 'next/server'
import { adminClient, PHOTO_BUCKET } from '@/lib/server/admin'
import { loadJob, isPhotoPathForPhase, MAX_PHOTOS_PER_SUBMIT } from '@/lib/server/job-token'
import { notifyNextSub } from '@/lib/server/notify'

// Public: the sub submits their uploaded photos and marks this job complete.
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const job = await loadJob(token)
  if (job instanceof NextResponse) return job
  if (job.phase.status === 'complete') return NextResponse.json({ error: 'This job is already complete.' }, { status: 409 })

  const { paths, note } = await req.json().catch(() => ({}))
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: 'Add at least one photo to complete the job.' }, { status: 400 })
  }
  if (paths.length > MAX_PHOTOS_PER_SUBMIT) return NextResponse.json({ error: 'Too many photos.' }, { status: 400 })

  const supabase = adminClient()
  const storage = supabase.storage.from(PHOTO_BUCKET)

  // Only accept photos that belong to this job and actually finished uploading.
  for (const path of paths) {
    if (typeof path !== 'string' || !isPhotoPathForPhase(path, job.phase.id)) {
      return NextResponse.json({ error: 'One of the photos is not part of this job.' }, { status: 400 })
    }
    const { data: exists } = await storage.exists(path)
    if (!exists) return NextResponse.json({ error: 'A photo did not finish uploading. Please try again.' }, { status: 400 })
  }

  const cleanNote = typeof note === 'string' ? note.slice(0, 2000) : ''
  const rows = paths.map((path: string) => ({
    phase_id: job.phase.id,
    storage_url: storage.getPublicUrl(path).data.publicUrl,
    note: cleanNote,
    uploaded_by: null,
  }))
  const { error: photoError } = await supabase.from('phase_photos').insert(rows)
  if (photoError) {
    console.error('[job complete] photo rows', photoError)
    return NextResponse.json({ error: 'Your photos could not be saved, so the job was not marked complete. Please try again.' }, { status: 500 })
  }

  const now = new Date().toISOString()
  const { error: phaseError } = await supabase.from('phases')
    .update({ status: 'complete', completed_at: now, ...(job.phase.started_at ? {} : { started_at: now }) })
    .eq('id', job.phase.id)
  if (phaseError) return NextResponse.json({ error: 'Photos saved, but the job could not be marked complete. Please try again.' }, { status: 500 })

  await supabase.from('job_tokens').update({ used: true }).eq('id', job.token.id)
  await supabase.from('activity_log').insert({
    project_id: job.phase.project_id,
    phase_id: job.phase.id,
    action: `${job.token.sub_name} completed "${job.phase.name}" with ${paths.length} photo${paths.length === 1 ? '' : 's'}`,
    actor_name: job.token.sub_name,
  })

  await notifyNextSub({ completedPhaseId: job.phase.id, projectId: job.phase.project_id })

  return NextResponse.json({ ok: true, status: 'complete' })
}
