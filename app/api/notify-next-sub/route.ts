import { NextRequest, NextResponse } from 'next/server'
import { getCaller, STAFF_ROLES } from '@/lib/server/auth'
import { adminClient } from '@/lib/server/admin'
import { notifyNextSub } from '@/lib/server/notify'

// Called from the dashboard and from a logged-in sub's /jobs page.
// Staff can notify for any phase; a sub only for a phase assigned to them.
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return NextResponse.json({ error: 'Please log in.' }, { status: 401 })

  const { completedPhaseId, scheduledTime } = await req.json()
  if (!completedPhaseId) return NextResponse.json({ error: 'Missing phase.' }, { status: 400 })

  const { data: phase } = await adminClient()
    .from('phases').select('id, project_id, sub_id').eq('id', completedPhaseId).single()
  if (!phase) return NextResponse.json({ error: 'Phase not found.' }, { status: 404 })

  const isStaff = STAFF_ROLES.includes(caller.role)
  const isAssignedSub = caller.role === 'sub' && phase.sub_id === caller.id
  if (!isStaff && !isAssignedSub) return NextResponse.json({ error: 'You do not have access to this.' }, { status: 403 })

  const result = await notifyNextSub({ completedPhaseId, projectId: phase.project_id, scheduledTime })
  if ('error' in result && result.error) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}
