'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OperationsPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [phases, setPhases] = useState<any[]>([])
  const [phaseSubs, setPhaseSubs] = useState<any[]>([])
  const [sendingLink, setSendingLink] = useState<string | null>(null)
  const [sentLink, setSentLink] = useState<{ [key: string]: boolean }>({})
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    load()
    // Realtime updates
    const channel = supabase
      .channel('ops-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'phases' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (userData?.role === 'sub') { router.push('/jobs'); return }
    setUser(userData)

    const { data: projectData } = await supabase.from('projects').select('*').eq('status', 'active')
    setProjects(projectData || [])

    const projectIds = (projectData || []).map((p: any) => p.id)
    if (projectIds.length === 0) return

    const { data: phaseData } = await supabase
      .from('phases')
      .select('*, projects(name, address)')
      .in('project_id', projectIds)
      .order('order_index', { ascending: true })
    setPhases(phaseData || [])

    const { data: psData } = await supabase
      .from('phase_subs')
      .select('*')
      .in('phase_id', (phaseData || []).map((p: any) => p.id))
    setPhaseSubs(psData || [])
  }

  async function sendLink(phaseId: string, subId: string, subName: string, subPhone: string, subEmail: string) {
    setSendingLink(subId)
    await fetch('/api/send-job-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseId, subName, subPhone, subEmail })
    })
    setSendingLink(null)
    setSentLink(prev => ({ ...prev, [subId]: true }))
    setTimeout(() => setSentLink(prev => ({ ...prev, [subId]: false })), 3000)
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4B5563', fontFamily: 'sans-serif' }}>Loading...</p>
    </div>
  )

  const inProgress = phases.filter(p => p.status === 'in_progress')
  const notStartedAssigned = phases.filter(p => p.status === 'not_started' && phaseSubs.some(ps => ps.phase_id === p.id))
  const unassigned = phases.filter(p => p.status === 'not_started' && !phaseSubs.some(ps => ps.phase_id === p.id))
  const completedToday = phases.filter(p => {
    if (p.status !== 'complete' || !p.completed_at) return false
    return new Date(p.completed_at).toDateString() === new Date().toDateString()
  })

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ background: '#111318', borderBottom: '1px solid #1E2128', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', cursor: 'pointer' }} onClick={() => router.push('/dashboard/operations')}>SiteSync</span>
          </div>
          <span style={{ color: '#2D3139' }}>›</span>
          <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>Operations</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #1E2128', borderRadius: '8px', padding: '5px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>← Dashboard</button>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ background: 'none', border: '1px solid #1E2128', borderRadius: '8px', padding: '5px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ padding: '24px 28px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: '#4B5563', margin: '0 0 4px', fontFamily: "'DM Mono', monospace" }}>{today}</p>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Good morning, {user.name?.split(' ')[0]} 👋</h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{projects.length} active build{projects.length !== 1 ? 's' : ''} across Legacy Homes</p>
        </div>

        {/* Daily stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '28px' }}>
          {[
            { label: 'In Progress', value: inProgress.length, color: '#3B82F6', bg: '#0F1929', border: '#1D4ED8' },
            { label: 'Completed Today', value: completedToday.length, color: '#22C55E', bg: '#0A1F0A', border: '#166534' },
            { label: 'Ready to Start', value: notStartedAssigned.length, color: '#F97316', bg: '#1A0E00', border: '#7C2D12' },
            { label: 'Needs Assignment', value: unassigned.length, color: unassigned.length > 0 ? '#EF4444' : '#4B5563', bg: unassigned.length > 0 ? '#1F0A0A' : '#111318', border: unassigned.length > 0 ? '#7F1D1D' : '#1E2128' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '12px', padding: '14px 18px' }}>
              <p style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: s.color, margin: 0, fontFamily: "'DM Mono', monospace", letterSpacing: '-1px' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* In Progress */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>● In Progress</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {inProgress.map(phase => {
                const subs = phaseSubs.filter(ps => ps.phase_id === phase.id)
                return (
                  <div key={phase.id} style={{ background: '#0F1929', border: '1px solid #1D4ED8', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <p style={{ fontSize: '15px', fontWeight: '600', color: '#F9FAFB', margin: 0 }}>{phase.name}</p>
                        <span style={{ fontSize: '11px', color: '#4B5563' }}>·</span>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{phase.projects?.name}</p>
                      </div>
                      <p style={{ fontSize: '11px', color: '#374151', margin: 0, fontFamily: "'DM Mono', monospace" }}>{phase.projects?.address}</p>
                      {subs.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {subs.map(s => (
                            <span key={s.id} style={{ background: '#1A1F2E', border: '1px solid #2D3748', borderRadius: '99px', padding: '2px 10px', fontSize: '11px', color: '#9CA3AF' }}>{s.sub_name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => router.push(`/dashboard/project/${phase.project_id}`)} style={{ background: 'none', border: '1px solid #1D4ED8', borderRadius: '8px', padding: '6px 12px', color: '#60A5FA', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>View →</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Unassigned — needs attention */}
        {unassigned.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#EF4444', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>⚠ Needs Assignment</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {unassigned.map(phase => (
                <div key={phase.id} style={{ background: '#1F0A0A', border: '1px solid #7F1D1D', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#F9FAFB', margin: 0 }}>{phase.name}</p>
                      <span style={{ fontSize: '11px', color: '#4B5563' }}>·</span>
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{phase.projects?.name}</p>
                    </div>
                    <p style={{ fontSize: '11px', color: '#374151', margin: 0, fontFamily: "'DM Mono', monospace" }}>{phase.projects?.address}</p>
                  </div>
                  <button onClick={() => router.push(`/dashboard/project/${phase.project_id}`)} style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '8px', padding: '6px 14px', color: '#FFF', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Assign →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ready to start */}
        {notStartedAssigned.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#F97316', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>▸ Ready to Start</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {notStartedAssigned.map(phase => {
                const subs = phaseSubs.filter(ps => ps.phase_id === phase.id)
                return (
                  <div key={phase.id} style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <p style={{ fontSize: '15px', fontWeight: '600', color: '#F9FAFB', margin: 0 }}>{phase.name}</p>
                        <span style={{ fontSize: '11px', color: '#4B5563' }}>·</span>
                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{phase.projects?.name}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {subs.map(s => (
                          <span key={s.id} style={{ background: '#1A1C22', border: '1px solid #2D3139', borderRadius: '99px', padding: '2px 10px', fontSize: '11px', color: '#9CA3AF' }}>{s.sub_name}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {subs.map(s => (
                        <button
                          key={s.id}
                          onClick={() => sendLink(phase.id, s.id, s.sub_name, s.sub_phone, s.sub_email)}
                          disabled={sendingLink === s.id}
                          style={{ background: sentLink[s.id] ? '#14532D' : '#0F1929', border: `1px solid ${sentLink[s.id] ? '#166534' : '#1D4ED8'}`, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: sentLink[s.id] ? '#4ADE80' : '#60A5FA', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          {sentLink[s.id] ? '✓ Sent' : `📱 Send to ${s.sub_name.split(' ')[0]}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Completed today */}
        {completedToday.length > 0 && (
          <div>
            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#22C55E', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>✓ Completed Today</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {completedToday.map(phase => (
                <div key={phase.id} style={{ background: '#0A1F0A', border: '1px solid #166534', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#4ADE80', margin: 0 }}>{phase.name}</p>
                      <span style={{ fontSize: '11px', color: '#166534' }}>·</span>
                      <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>{phase.projects?.name}</p>
                    </div>
                    <p style={{ fontSize: '11px', color: '#166534', margin: 0, fontFamily: "'DM Mono', monospace" }}>
                      ✓ {new Date(phase.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => router.push(`/dashboard/project/${phase.project_id}`)} style={{ background: 'none', border: '1px solid #166534', borderRadius: '8px', padding: '6px 12px', color: '#4ADE80', fontSize: '12px', cursor: 'pointer' }}>View photos →</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {inProgress.length === 0 && unassigned.length === 0 && notStartedAssigned.length === 0 && completedToday.length === 0 && (
          <div style={{ background: '#111318', border: '1px dashed #1E2128', borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#4B5563', fontSize: '14px', margin: 0 }}>No active phases right now. All quiet on the builds!</p>
          </div>
        )}
      </div>
    </div>
  )
}
