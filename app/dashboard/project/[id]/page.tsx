'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const statusConfig: any = {
  not_started: { label: 'Not Started', color: '#6B7280', bg: '#1A1C22', border: '#2D3139', dot: '#374151' },
  in_progress: { label: 'In Progress', color: '#60A5FA', bg: '#0F1929', border: '#1D4ED8', dot: '#3B82F6' },
  complete: { label: 'Complete', color: '#4ADE80', bg: '#0A1F0A', border: '#166534', dot: '#22C55E' },
  skipped: { label: 'Skipped', color: '#6B7280', bg: '#1A1C22', border: '#2D3139', dot: '#374151' },
}

function AddSubForm({ phaseId, subs, onAdd }: { phaseId: string, subs: any[], onAdd: (name: string, phone: string, email: string) => void }) {
  const [show, setShow] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  async function handleAdd() {
    if (!name.trim()) return
    await onAdd(name, phone, email)
    setName(''); setPhone(''); setEmail(''); setShow(false)
  }

  if (!show) return (
    <button onClick={() => setShow(true)} style={{ width: '100%', background: 'none', border: '1px dashed #1E2128', borderRadius: '8px', padding: '8px', color: '#4B5563', fontSize: '12px', cursor: 'pointer' }}>
      + Add subcontractor
    </button>
  )

  return (
    <div style={{ background: '#0A0C10', border: '1px solid #1E2128', borderRadius: '10px', padding: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name *" style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '7px', padding: '7px 10px', color: '#F9FAFB', fontSize: '12px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone +1..." style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '7px', padding: '7px 10px', color: '#F9FAFB', fontSize: '12px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
      </div>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ width: '100%', boxSizing: 'border-box', background: '#111318', border: '1px solid #1E2128', borderRadius: '7px', padding: '7px 10px', color: '#F9FAFB', fontSize: '12px', outline: 'none', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }} />
      {subs.length > 0 && (
        <select onChange={e => {
          const sub = subs.find((s: any) => s.id === e.target.value)
          if (sub) { setName(sub.name); setPhone(sub.phone || ''); setEmail(sub.email || '') }
        }} style={{ width: '100%', background: '#111318', border: '1px solid #1E2128', borderRadius: '7px', padding: '7px 10px', color: '#4B5563', fontSize: '11px', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }}>
          <option value="">— Or pick existing contractor —</option>
          {subs.map((sub: any) => <option key={sub.id} value={sub.id}>{sub.name}{sub.trade ? ` · ${sub.trade}` : ''}</option>)}
        </select>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => setShow(false)} style={{ flex: 1, background: 'none', border: '1px solid #1E2128', borderRadius: '7px', padding: '7px', color: '#6B7280', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleAdd} style={{ flex: 2, background: 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '7px', padding: '7px', color: '#FFF', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Add to Phase</button>
      </div>
    </div>
  )
}

export default function ProjectPage() {
  const [user, setUser] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [photos, setPhotos] = useState<{ [key: string]: any[] }>({})
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  const [newPhase, setNewPhase] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'activity'>('board')
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [scheduledTimes, setScheduledTimes] = useState<{ [key: string]: string }>({})
  const [phaseSubs, setPhaseSubs] = useState<{ [key: string]: any[] }>({})
  const [sendingLink, setSendingLink] = useState<string | null>(null)
  const [sentLink, setSentLink] = useState<{ [key: string]: boolean }>({})
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useEffect(() => {
    load()

    // Realtime — board updates instantly when a sub marks a phase complete
    const channel = supabase
      .channel('phases-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'phases',
        filter: `project_id=eq.${projectId}`
      }, () => { load() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(userData)
    const { data: projectData } = await supabase.from('projects').select('*').eq('id', projectId).single()
    setProject(projectData)
    const { data: phaseData } = await supabase.from('phases').select('*, users(name, trade)').eq('project_id', projectId).order('order_index', { ascending: true })
    setPhases(phaseData || [])
    const { data: subData } = await supabase.from('users').select('*').eq('role', 'sub')
    const { data: activityData } = await supabase.from('activity_log').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(50)
    setActivityLog(activityData || [])
    setSubs(subData || [])
    const { data: phaseSubData } = await supabase.from('phase_subs').select('*').in('phase_id', (phaseData || []).map((p: any) => p.id))
    const grouped: { [key: string]: any[] } = {}
    for (const ps of (phaseSubData || [])) {
      if (!grouped[ps.phase_id]) grouped[ps.phase_id] = []
      grouped[ps.phase_id].push(ps)
    }
    setPhaseSubs(grouped)
  }

  async function loadPhotos(phaseId: string) {
    if (expandedPhase === phaseId) { setExpandedPhase(null); return }
    const { data } = await supabase.from('phase_photos').select('*, users(name)').eq('phase_id', phaseId).order('created_at', { ascending: false })
    setPhotos(prev => ({ ...prev, [phaseId]: data || [] }))
    setExpandedPhase(phaseId)
  }

  async function addPhase(e: React.FormEvent) {
    e.preventDefault()
    if (!newPhase.trim()) return
    setLoading(true)
    await supabase.from('phases').insert({ project_id: projectId, name: newPhase, order_index: phases.length + 1, status: 'not_started' })
    setNewPhase('')
    await load()
    setLoading(false)
  }

  async function assignSub(phaseId: string, subId: string) {
    await supabase.from('phases').update({ sub_id: subId || null }).eq('id', phaseId)
    await load()
  }

  async function activateProject() {
    await supabase.from('projects').update({ status: 'active', activated_at: new Date().toISOString() }).eq('id', projectId)
    await load()
  }

  async function completeProject() {
    await supabase.from('projects').update({ status: 'complete' }).eq('id', projectId)
    await load()
  }

  if (!project || !user) return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ color: '#4B5563' }}>Loading...</p>
    </div>
  )

  const completedCount = phases.filter(p => p.status === 'complete').length
  const inProgressCount = phases.filter(p => p.status === 'in_progress').length
  const progressPct = phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0
  const isManager = user.role !== 'sub'

  // Group phases by status for board view
  const notStarted = phases.filter(p => p.status === 'not_started')
  const inProgress = phases.filter(p => p.status === 'in_progress')
  const completed = phases.filter(p => p.status === 'complete')

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
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>SiteSync</span>
          </div>
          <span style={{ color: '#2D3139' }}>›</span>
          <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>{project.name}</span>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #1E2128', borderRadius: '8px', padding: '5px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>← Dashboard</button>
      </nav>

      <div style={{ padding: '24px 28px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Project Header */}
        <div style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.4px' }}>{project.name}</h1>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontFamily: "'DM Mono', monospace" }}>{project.address} · {project.client_name}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {project.status === 'active' && <span style={{ background: '#0A1F0A', border: '1px solid #166534', borderRadius: '99px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', color: '#4ADE80' }}>● Live</span>}
              {project.status === 'inactive' && <span style={{ background: '#1A1C22', border: '1px solid #374151', borderRadius: '99px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', color: '#6B7280' }}>Inactive</span>}
              {project.status === 'complete' && <span style={{ background: '#1E1B4B', border: '1px solid #3730A3', borderRadius: '99px', padding: '5px 14px', fontSize: '12px', fontWeight: '600', color: '#818CF8' }}>✓ Complete</span>}
              {isManager && project.status === 'inactive' && (
                <button onClick={activateProject} style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', border: 'none', borderRadius: '99px', padding: '5px 16px', fontSize: '12px', fontWeight: '600', color: '#FFF', cursor: 'pointer' }}>Activate</button>
              )}
              {isManager && project.status === 'active' && (
                <button onClick={completeProject} style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', border: 'none', borderRadius: '99px', padding: '5px 16px', fontSize: '12px', fontWeight: '600', color: '#FFF', cursor: 'pointer' }}>Mark Complete</button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {phases.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{completedCount} of {phases.length} phases complete</span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#F97316', fontFamily: "'DM Mono', monospace" }}>{progressPct}%</span>
              </div>
              <div style={{ height: '6px', background: '#1E2128', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: progressPct === 100 ? '#22C55E' : 'linear-gradient(90deg, #F97316, #FBBF24)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                {[
                  { label: 'Not started', count: notStarted.length, color: '#4B5563' },
                  { label: 'In progress', count: inProgressCount, color: '#3B82F6' },
                  { label: 'Complete', count: completedCount, color: '#22C55E' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color }} />
                    <span style={{ fontSize: '11px', color: '#4B5563', fontFamily: "'DM Mono', monospace" }}>{s.count} {s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Phase Ticket Board */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Phase Board</h2>

          {phases.length === 0 ? (
            <div style={{ background: '#111318', border: '1px dashed #1E2128', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
              <p style={{ color: '#4B5563', fontSize: '14px', margin: 0 }}>No phases yet. Add your first phase below.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {phases.map((phase, index) => {
                const sc = statusConfig[phase.status] || statusConfig.not_started
                const phasePhotos = photos[phase.id] || []
                const isExpanded = expandedPhase === phase.id

                return (
                  <div key={phase.id} style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.2s' }}>

                    {/* Ticket Header */}
                    <div style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                        {/* Phase number + status dot */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontSize: '11px', color: '#374151', fontWeight: '600', fontFamily: "'DM Mono', monospace", width: '18px' }}>#{index + 1}</span>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                        </div>

                        {/* Phase name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#F9FAFB' }}>{phase.name}</span>
                          {phase.users && (
                            <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>
                              → {phase.users.name}{phase.users.trade ? ` (${phase.users.trade})` : ''}
                            </span>
                          )}
                        </div>

                        {/* Status badge */}
                        <span style={{ fontSize: '11px', fontWeight: '600', color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '99px', padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {sc.label}
                        </span>

                        {/* Photos button - only when complete */}
                        {phase.status === 'complete' && (
                          <button
                            onClick={() => loadPhotos(phase.id)}
                            style={{ background: isExpanded ? '#0F1929' : 'none', border: '1px solid #1D4ED8', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: '#60A5FA', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            {isExpanded ? '▲ Hide photos' : `📷 View photos`}
                          </button>
                        )}

                        {/* In progress indicator */}
                        {phase.status === 'in_progress' && (
                          <span style={{ fontSize: '11px', color: '#60A5FA', fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>Awaiting completion...</span>
                        )}
                      </div>

                      {/* Sub assignment — manager only */}
                      {isManager && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>

                          {/* Existing subs on this phase */}
                          {(phaseSubs[phase.id] || []).map((ps: any) => (
                            <div key={ps.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', background: '#0A0C10', border: '1px solid #1E2128', borderRadius: '8px', padding: '8px 12px' }}>
                              <div style={{ width: '28px', height: '28px', background: '#1E2128', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#F97316' }}>{ps.sub_name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#F9FAFB', margin: 0 }}>{ps.sub_name}</p>
                                <p style={{ fontSize: '11px', color: '#4B5563', margin: 0 }}>{ps.sub_email || ps.sub_phone || 'No contact'}</p>
                              </div>
                              <button
                                onClick={async () => {
                                  setSendingLink(ps.id)
                                  await fetch('/api/send-job-link', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ phaseId: phase.id, subName: ps.sub_name, subPhone: ps.sub_phone, subEmail: ps.sub_email })
                                  })
                                  setSendingLink(null)
                                  setSentLink(prev => ({ ...prev, [ps.id]: true }))
                                  setTimeout(() => setSentLink(prev => ({ ...prev, [ps.id]: false })), 3000)
                                }}
                                disabled={sendingLink === ps.id}
                                style={{ background: sentLink[ps.id] ? '#14532D' : '#0F1929', border: `1px solid ${sentLink[ps.id] ? '#166534' : '#1D4ED8'}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: sentLink[ps.id] ? '#4ADE80' : '#60A5FA', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                              >
                                {sendingLink === ps.id ? '...' : sentLink[ps.id] ? '✓ Sent!' : '📱 Send link'}
                              </button>
                              <button
                                onClick={async () => {
                                  await supabase.from('phase_subs').delete().eq('id', ps.id)
                                  await load()
                                }}
                                style={{ background: 'none', border: 'none', color: '#4B5563', fontSize: '16px', cursor: 'pointer', flexShrink: 0, padding: '0 4px' }}
                              >×</button>
                            </div>
                          ))}

                          {/* Add new sub form */}
                          <AddSubForm
                            phaseId={phase.id}
                            subs={subs}
                            onAdd={async (name: string, phone: string, email: string) => {
                              await supabase.from('phase_subs').insert({ phase_id: phase.id, sub_name: name, sub_phone: phone || null, sub_email: email || null })
                              await load()
                            }}
                          />
                        </div>
                      )}

                      {/* Scheduled start time for next phase — manager only */}
                      {isManager && phase.status === 'in_progress' && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: '5px' }}>
                            Next phase start time (sent to next sub when this completes)
                          </label>
                          <input
                            type="text"
                            value={scheduledTimes[phase.id] || ''}
                            onChange={e => setScheduledTimes(prev => ({ ...prev, [phase.id]: e.target.value }))}
                            placeholder="e.g. Tomorrow at 8:00 AM"
                            style={{ width: '100%', boxSizing: 'border-box', background: '#0A0C10', border: '1px solid #1E2128', borderRadius: '8px', padding: '7px 12px', color: '#F9FAFB', fontSize: '12px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                          />
                        </div>
                      )}

                      {/* Timestamps */}
                      {(phase.started_at || phase.completed_at) && (
                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                          {phase.started_at && <span style={{ fontSize: '11px', color: '#374151', fontFamily: "'DM Mono', monospace" }}>Started {new Date(phase.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                          {phase.completed_at && <span style={{ fontSize: '11px', color: '#166534', fontFamily: "'DM Mono', monospace" }}>✓ Completed {new Date(phase.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        </div>
                      )}
                    </div>

                    {/* Photo panel — expands when clicked */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${sc.border}`, background: '#0A0C10', padding: '16px' }}>
                        {phasePhotos.length === 0 ? (
                          <p style={{ color: '#4B5563', fontSize: '13px', margin: 0 }}>No photos uploaded yet.</p>
                        ) : (
                          <>
                            <p style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                              {phasePhotos.length} photo{phasePhotos.length !== 1 ? 's' : ''} submitted
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                              {phasePhotos.map((photo: any, i: number) => (
                                <div key={photo.id} style={{ background: '#111318', borderRadius: '10px', overflow: 'hidden', border: '1px solid #1E2128' }}>
                                  <img
                                    src={photo.storage_url}
                                    alt={`Photo ${i + 1}`}
                                    style={{ width: '100%', height: '120px', objectFit: 'cover', cursor: 'zoom-in', display: 'block' }}
                                    onClick={() => window.open(photo.storage_url, '_blank')}
                                  />
                                  <div style={{ padding: '8px 10px' }}>
                                    {photo.note && <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 3px', fontStyle: 'italic' }}>"{photo.note}"</p>}
                                    <p style={{ fontSize: '10px', color: '#4B5563', margin: 0, fontFamily: "'DM Mono', monospace" }}>
                                      {photo.users?.name || 'Unknown'} · {new Date(photo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        </div>}

        {activeTab === 'board' && isManager && (
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#4B5563', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Quick add</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {[
                'Site Prep', 'Foundation', 'Framing', 'Roofing', 'Windows & Doors',
                'Rough Plumbing', 'Rough Electric', 'HVAC Rough-In', 'Insulation',
                'Drywall', 'Painting', 'Trim & Finish', 'Flooring', 'Cabinets',
                'Final Plumbing', 'Final Electric', 'Final HVAC', 'Punch List', 'Final Walkthrough'
              ].filter(t => !phases.find(p => p.name === t)).map(template => (
                <button
                  key={template}
                  onClick={async () => {
                    setLoading(true)
                    await supabase.from('phases').insert({ project_id: projectId, name: template, order_index: phases.length + 1, status: 'not_started' })
                    await load()
                    setLoading(false)
                  }}
                  style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '99px', padding: '5px 12px', fontSize: '12px', color: '#9CA3AF', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.color = '#F97316' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E2128'; e.currentTarget.style.color = '#9CA3AF' }}
                >
                  + {template}
                </button>
              ))}
            </div>
            <form onSubmit={addPhase} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={newPhase}
                onChange={e => setNewPhase(e.target.value)}
                placeholder="Or type a custom phase..."
                style={{ flex: 1, background: '#111318', border: '1px solid #1E2128', borderRadius: '10px', padding: '12px 16px', color: '#F9FAFB', fontSize: '13px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}
                onFocus={e => e.target.style.borderColor = '#F97316'}
                onBlur={e => e.target.style.borderColor = '#1E2128'}
              />
              <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '10px', padding: '12px 20px', color: '#FFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Add
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
