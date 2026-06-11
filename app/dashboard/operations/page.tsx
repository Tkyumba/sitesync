'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OperationsPage() {
  const [user, setUser] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [resending, setResending] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    setUser(userData)
    const { data: phaseData } = await supabase
      .from('phases')
      .select('*, projects(name, address, status)')
      .eq('projects.status', 'active')
      .order('order_index', { ascending: true })
    setPhases((phaseData || []).filter(p => p.projects?.status === 'active'))
  }

  async function resendLink(phase: any) {
    setResending(phase.id)
    try {
      const res = await fetch('/api/send-job-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseId: phase.id,
          subName: phase.sub_name,
          subPhone: phase.sub_phone,
          subEmail: phase.sub_email
        })
      })
      if (res.ok) await load()
    } finally {
      setResending(null)
    }
  }

  function getPhaseStatus(phase: any) {
    if (phase.status === 'complete') return { label: 'Complete', color: '#22C55E', bg: '#0A1F0A', border: '#166534', dot: '#22C55E' }
    if (phase.status === 'in_progress') return { label: 'In Progress', color: '#3B82F6', bg: '#0F1929', border: '#1D4ED8', dot: '#3B82F6' }
    if (phase.link_opened_at) return { label: 'Link Opened', color: '#A78BFA', bg: '#1A0F2E', border: '#6D28D9', dot: '#A78BFA' }
    if (phase.link_sent_at) return { label: 'Link Sent', color: '#F59E0B', bg: '#1C1400', border: '#92400E', dot: '#F59E0B' }
    if (phase.sub_name) return { label: 'Assigned', color: '#6B7280', bg: '#1F1F1F', border: '#374151', dot: '#6B7280' }
    return { label: 'Unassigned', color: '#EF4444', bg: '#1C0A0A', border: '#7F1D1D', dot: '#EF4444' }
  }

  function isOverdue(phase: any) {
    if (phase.status === 'complete') return false
    if (!phase.link_sent_at) return false
    const daysSinceSent = (Date.now() - new Date(phase.link_sent_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceSent > 3
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280' }}>Loading...</p>
    </div>
  )

  const inProgress = phases.filter(p => p.status === 'in_progress')
  const linkSent = phases.filter(p => p.status !== 'complete' && p.status !== 'in_progress' && p.link_sent_at && !p.link_opened_at)
  const linkOpened = phases.filter(p => p.status !== 'complete' && p.status !== 'in_progress' && p.link_opened_at)
  const needsAssignment = phases.filter(p => p.status !== 'complete' && !p.sub_name)
  const readyToSend = phases.filter(p => p.status !== 'complete' && p.sub_name && !p.link_sent_at)
  const completed = phases.filter(p => p.status === 'complete')
  const overdue = phases.filter(p => isOverdue(p))

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <nav style={{ background: '#1C1F26', borderBottom: '1px solid #2D3139', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
  <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>
  <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>SiteSync</span>
</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span onClick={() => router.push('/dashboard')} style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer' }}>All Projects</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ background: 'none', border: '1px solid #2D3139', borderRadius: '8px', padding: '6px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ fontSize: '12px', color: '#4B5563', margin: '0 0 4px' }}>{today}</p>
        <p style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 4px' }}>Good morning, {user.name?.split(' ')[0]} 👋</p>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 28px' }}>{phases.filter(p => p.projects).length} active phases across Legacy Homes</p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '28px' }}>
          {[
            { label: 'In Progress', value: inProgress.length, color: '#3B82F6' },
            { label: 'Completed Today', value: completed.filter(p => p.completed_at && new Date(p.completed_at).toDateString() === new Date().toDateString()).length, color: '#22C55E' },
            { label: 'Awaiting Response', value: linkSent.length, color: '#F59E0B' },
            { label: 'Needs Assignment', value: needsAssignment.length, color: '#EF4444' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#1C1F26', border: '1px solid #2D3139', borderRadius: '12px', padding: '14px 16px' }}>
              <p style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', margin: '0 0 6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ fontSize: '26px', fontWeight: '700', color: stat.color, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Overdue */}
        {overdue.length > 0 && (
          <div style={{ background: '#1C0A0A', border: '1px solid #7F1D1D', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#EF4444', margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>⚠ Overdue — Link sent 3+ days ago, no response</p>
            {overdue.map(phase => (
              <div key={phase.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #2D1515' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', margin: '0 0 2px' }}>{phase.name}</p>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{phase.projects?.name} · {phase.sub_name}</p>
                </div>
                <button
                  onClick={() => resendLink(phase)}
                  disabled={resending === phase.id}
                  style={{ background: '#7F1D1D', border: '1px solid #EF4444', borderRadius: '8px', padding: '6px 14px', color: '#FCA5A5', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  {resending === phase.id ? 'Sending...' : 'Resend Link'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* In Progress */}
        {inProgress.length > 0 && (
          <Section title="🔵 In Progress" color="#3B82F6">
            {inProgress.map(phase => <PhaseRow key={phase.id} phase={phase} status={getPhaseStatus(phase)} />)}
          </Section>
        )}

        {/* Link Opened */}
        {linkOpened.length > 0 && (
          <Section title="👀 Link Opened — Awaiting Start" color="#A78BFA">
            {linkOpened.map(phase => <PhaseRow key={phase.id} phase={phase} status={getPhaseStatus(phase)} />)}
          </Section>
        )}

        {/* Link Sent */}
        {linkSent.length > 0 && (
          <Section title="📨 Link Sent — Not Opened Yet" color="#F59E0B">
            {linkSent.map(phase => (
              <PhaseRow key={phase.id} phase={phase} status={getPhaseStatus(phase)}>
                <button
                  onClick={() => resendLink(phase)}
                  disabled={resending === phase.id}
                  style={{ background: 'none', border: '1px solid #92400E', borderRadius: '8px', padding: '5px 12px', color: '#F59E0B', fontSize: '12px', cursor: 'pointer' }}>
                  {resending === phase.id ? 'Sending...' : 'Resend'}
                </button>
              </PhaseRow>
            ))}
          </Section>
        )}

        {/* Ready to Send */}
        {readyToSend.length > 0 && (
          <Section title="✉ Ready to Send" color="#6B7280">
            {readyToSend.map(phase => <PhaseRow key={phase.id} phase={phase} status={getPhaseStatus(phase)} />)}
          </Section>
        )}

        {/* Needs Assignment */}
        {needsAssignment.length > 0 && (
          <Section title="⚠ Needs Assignment" color="#EF4444">
            {needsAssignment.map(phase => (
              <PhaseRow key={phase.id} phase={phase} status={getPhaseStatus(phase)}>
                <button
                  onClick={() => router.push(`/dashboard/project/${phase.project_id}`)}
                  style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '8px', padding: '5px 12px', color: '#FFF', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  Assign →
                </button>
              </PhaseRow>
            ))}
          </Section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <Section title="✅ Completed" color="#22C55E">
            {completed.map(phase => <PhaseRow key={phase.id} phase={phase} status={getPhaseStatus(phase)} />)}
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, color, children }: { title: string, color: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <p style={{ fontSize: '12px', fontWeight: '600', color, margin: '0 0 10px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>{children}</div>
    </div>
  )
}

function PhaseRow({ phase, status, children }: { phase: any, status: any, children?: React.ReactNode }) {
  const sentAgo = phase.link_sent_at ? Math.floor((Date.now() - new Date(phase.link_sent_at).getTime()) / (1000 * 60 * 60)) : null
  const openedAgo = phase.link_opened_at ? Math.floor((Date.now() - new Date(phase.link_opened_at).getTime()) / (1000 * 60 * 60)) : null

  return (
    <div style={{ background: '#1C1F26', border: `1px solid ${status.border}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.dot, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF', margin: '0 0 2px' }}>{phase.name}</p>
          <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
            {phase.projects?.name}
            {phase.sub_name && ` · ${phase.sub_name}`}
            {sentAgo !== null && phase.status !== 'complete' && ` · sent ${sentAgo}h ago`}
            {openedAgo !== null && phase.status !== 'complete' && ` · opened ${openedAgo}h ago`}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: status.color, background: status.bg, border: `1px solid ${status.border}`, borderRadius: '20px', padding: '3px 10px' }}>
          {status.label}
        </span>
        {children}
      </div>
    </div>
  )
}