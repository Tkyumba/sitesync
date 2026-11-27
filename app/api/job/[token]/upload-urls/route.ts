import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { adminClient, PHOTO_BUCKET } from '@/lib/server/admin'
import { loadJob, ALLOWED_PHOTO_EXTENSIONS, MAX_PHOTOS_PER_SUBMIT } from '@/lib/server/job-token'

// Public: hands the sub one-time upload slots for their photos, for this job only.
// Storage itself stays closed to logged-out visitors.
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const job = await loadJob(token)
  if (job instanceof NextResponse) return job
  if (job.phase.status === 'complete') return NextResponse.json({ error: 'This job is already complete.' }, { status: 409 })

  const { files } = await req.json().catch(() => ({ files: [] }))
  if (!Array.isArray(files) || files.length === 0) return NextResponse.json({ error: 'No photos selected.' }, { status: 400 })
  if (files.length > MAX_PHOTOS_PER_SUBMIT) {
    return NextResponse.json({ error: `Please submit at most ${MAX_PHOTOS_PER_SUBMIT} photos at a time.` }, { status: 400 })
  }

  const storage = adminClient().storage.from(PHOTO_BUCKET)
  const slots: { path: string; token: string }[] = []
  for (const f of files) {
    const rawExt = String(f?.name || '').split('.').pop()?.toLowerCase() || ''
    const ext = ALLOWED_PHOTO_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg'
    const path = `${job.phase.id}-${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`
    const { data, error } = await storage.createSignedUploadUrl(path)
    if (error || !data) return NextResponse.json({ error: 'Could not prepare the upload. Please try again.' }, { status: 500 })
    slots.push({ path: data.path, token: data.token })
  }
  return NextResponse.json({ slots })
}
