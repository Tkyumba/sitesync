import 'server-only'
import { NextResponse } from 'next/server'
import { adminClient } from './admin'

export type JobContext = {
  token: { id: string; token: string; sub_name: string; used: boolean | null; expires_at: string | null; opened_count: number | null }
  phase: {
    id: string; project_id: string; name: string; status: string | null
    started_at: string | null; completed_at: string | null; due_date: string | null; link_opened_at: string | null
  }
  project: { name: string; address: string } | null
}

// Looks up a sub's job link and checks it is real and not expired.
// Returns either the job details or an error response to send back.
export async function loadJob(rawToken: string): Promise<JobContext | NextResponse> {
  if (!rawToken || !/^[a-f0-9]{16,128}$/i.test(rawToken)) {
    return NextResponse.json({ error: 'invalid' }, { status: 404 })
  }
  const { data } = await adminClient()
    .from('job_tokens')
    .select('id, token, sub_name, used, expires_at, opened_count, phases(id, project_id, name, status, started_at, completed_at, due_date, link_opened_at, projects(name, address))')
    .eq('token', rawToken)
    .single()

  const phase = (data as any)?.phases
  if (!data || !phase) return NextResponse.json({ error: 'invalid' }, { status: 404 })
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  const { projects, ...phaseFields } = phase
  return { token: data as JobContext['token'], phase: phaseFields, project: projects ?? null }
}

// What the sub's page is allowed to see. Nothing about other jobs, money or people.
export function publicJobView(ctx: JobContext) {
  return {
    subName: ctx.token.sub_name,
    phase: {
      id: ctx.phase.id,
      name: ctx.phase.name,
      status: ctx.phase.status,
      started_at: ctx.phase.started_at,
      completed_at: ctx.phase.completed_at,
      due_date: ctx.phase.due_date,
    },
    project: ctx.project ? { name: ctx.project.name, address: ctx.project.address } : null,
  }
}

export const ALLOWED_PHOTO_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif']
export const MAX_PHOTOS_PER_SUBMIT = 20

// Photo files for a phase are always named "<phase id>-<time>-<random>.<ext>".
export function isPhotoPathForPhase(path: string, phaseId: string) {
  const ext = ALLOWED_PHOTO_EXTENSIONS.join('|')
  return new RegExp(`^${phaseId}-\\d{10,16}-[a-z0-9]{6,20}\\.(${ext})$`, 'i').test(path)
}
