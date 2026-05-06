'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const S: any = {
  wrap: { minHeight: '100vh', background: '#0F1117', fontFamily: "'Inter', -apple-system, sans-serif" },
  nav: {
    background: '#1C1F26', borderBottom: '1px solid #2D3139',
    padding: '0 24px', height: '60px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'sticky' as const, top: 0, zIndex: 50
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoBox: {
    width: '30px', height: '30px',
    background: 'linear-gradient(135deg, #F97316, #EA580C)',
    borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  logoText: { fontSize: '18px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.3px' },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: '1px solid #2D3139',
    borderRadius: '8px', padding: '6px 12px',
    color: '#6B7280', fontSize: '13px', cursor: 'pointer'
  },
  body: { padding: '24px', maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '28px' },
  projectTitle: { fontSize: '26px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 6px', letterSpacing: '-0.5px' },
  projectMeta: { fontSize: '14px', color: '#6B7280', margin: '0 0 14px' },
  badgeRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  liveBadge: {
    background: '#1A2B1A', border: '1px solid #166534',
    borderRadius: '20px', padding: '5px 14px',
    fontSize: '12px', fontWeight: '600', color: '#4ADE80'
  },
  inactiveBadge: {
    background: '#1F1F1F', border: '1px solid #374151',
    borderRadius: '20px', padding: '5px 14px',
    fontSize: '12px', fontWeight: '600', color: '#6B7280'
  },
  completeBadge: {
    background: '#1A1A2B', border: '1px solid #3730A3',
    borderRadius: '20px', padding: '5px 14px',
    fontSize: '12px', fontWeight: '600', color: '#818CF8'
  },
  activateBtn: {
    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
    border: 'none', borderRadius: '20px', padding: '5px 16px',
    fontSize: '12px', fontWeight: '600', color: '#FFFFFF',
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.3)'
  },
  completeBtn: {
    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    border: 'none', borderRadius: '20px', padding: '5px 16px',
    fontSize: '12px', fontWeight: '600', color: '#FFFFFF',
    cursor: 'pointer'
  },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#FFFFFF', margin: '0 0 14px' },
  phaseCard: {
    background: '#1C1F26', border: '1px solid #2D3139',
    borderRadius: '12px', overflow: 'hidden', marginBottom: '8px'
  },
  phaseInner: { padding: '14px 16px' },
  phaseRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  phaseLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  phaseNum: { fontSize: '12px', color: '#374151', fontWeight: '600', fontFamily: 'monospace', width: '20px' },
  phaseName: { fontSize: '14px', fontWeight: '600', color: '#FFFFFF' },
  phaseRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  viewPhotosBtn: {
    background: 'none', border: '1px solid #2D3139',
    borderRadius: '6px', padding: '4px 10px',
    fontSize: '12px', color: '#3B82F6', cursor: 'pointer'
  },
  select: {
    background: '#0F1117', border: '1px solid #2D3139',
    borderRadius: '8px', padding: '8px 12px',
    color: '#9CA3AF', fontSize: '13px',
    width: '100%', outline: 'none', cursor: 'pointer'
  },
  photoSection: { borderTop: '1px solid #2D3139', padding: '16px', background: '#0F1117' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px' },
  addPhaseRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  addPhaseInput: {
    flex: 1, background: '#1C1F26', border: '1px solid #2D3139',
    borderRadius: '10px', padding: '12px 14px',
    color: '#FFFFFF', fontSize: '14px', outline: 'none'
  },
  addBtn: {
    background: 'linear-gradient(135deg, #F97316, #EA580C)',
    border: 'none', borderRadius: '10px', padding: '12px 20px',
    color: '#FFFFFF', fontSize: '14px', fontWeight: '600',
    cursor: 'pointer'
  }
}

const statusConfig: any = {
  not_started: { label: 'Not started', color: '#6B7280', bg: '#1F1F1F', border: '#374151' },
  in_progress: { label: 'In progress', color: '#3B82F6', bg: '#1A1F2E', border: '#1D4ED8' },
  complete: { label: 'Complete', color: '#22C55E', bg: '#1A2B1A', border: '#166534' },
  skipped: { label: 'Skipped', color: '#6B7280', bg: '#1F1F1F', border: '#374151' },
}

export default function ProjectPage() {
  const [project, setProject] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [photos, setPhotos] = useState<{ [key: string]: any[] }>({})
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  const [newPhase, setNewPhase] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useEffect(() => { load() }, [])

  async function load() {
    const { data: projectData } = await supabase.from('projects').select('*').eq('id', projectId).single()
    setProject(projectData)
    const { data: phaseData } = await supabase.from('phases').select('*').eq('project_id', projectId).order('order_index', { ascending: true })
    setPhases(phaseData || [])
    const { data: subData } = await supabase.from('users').select('*').eq('role', 'sub')
    setSubs(subData || [])
  }

  async function loadPhotos(phaseId: string) {
    const { data } = await supabase.from('phase_photos').select('*').eq('phase_id', phaseId).order('created_at', { ascending: false })
    setPhotos(prev => ({ ...prev, [phaseId]: data || [] }))
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId)
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

  if (!project) return (
    <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  const completedPhases = phases.filter(p => p.status === 'complete').length
  const progressPct = phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0

  return (
    <div style={S.wrap}>
      <nav style={S.nav}>
        <div style={S.navLogo}>
          <div style={S.logoBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span style={S.logoText}>SiteSync</span>
        </div>
        <button style={S.backBtn} onClick={() => router.push('/dashboard')}>
          ← Back to dashboard
        </button>
      </nav>

      <div style={S.body}>
        <div style={S.header}>
          <h1 style={S.projectTitle}>{project.name}</h1>
          <p style={S.projectMeta}>{project.address} · {project.client_name}</p>

          <div style={S.badgeRow}>
            {project.status === 'active' && <span style={S.liveBadge}>● Live</span>}
            {project.status === 'inactive' && <span style={S.inactiveBadge}>Inactive</span>}
            {project.status === 'complete' && <span style={S.completeBadge}>✓ Complete</span>}
            {project.status === 'inactive' && (
              <button style={S.activateBtn} onClick={activateProject}>Activate Project</button>
            )}
            {project.status === 'active' && (
              <button style={S.completeBtn} onClick={completeProject}>Mark as Complete</button>
            )}
          </div>

          {phases.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>Build progress</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#F97316' }}>{progressPct}%</span>
              </div>
              <div style={{ height: '5px', background: '#2D3139', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progressPct}%`, background: 'linear-gradient(90deg, #F97316, #22C55E)', borderRadius: '99px', transition: 'width 0.5s ease' }}></div>
              </div>
              <p style={{ fontSize: '12px', color: '#4B5563', marginTop: '6px' }}>{completedPhases} of {phases.length} phases complete</p>
            </div>
          )}
        </div>

        <p style={S.sectionTitle}>Build Phases</p>

        {phases.map((phase, index) => {
          const sc = statusConfig[phase.status] || statusConfig.not_started
          return (
            <div key={phase.id} style={{
              ...S.phaseCard,
              borderColor: phase.status === 'in_progress' ? '#1D4ED8' : phase.status === 'complete' ? '#166534' : '#2D3139'
            }}>
              <div style={S.phaseInner}>
                <div style={S.phaseRow}>
                  <div style={S.phaseLeft}>
                    <span style={S.phaseNum}>{index + 1}</span>
                    <span style={S.phaseName}>{phase.name}</span>
                  </div>
                  <div style={S.phaseRight}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: '20px', padding: '3px 10px' }}>
                      {sc.label}
                    </span>
                    {phase.status === 'complete' && (
                      <button style={S.viewPhotosBtn} onClick={() => loadPhotos(phase.id)}>
                        {expandedPhase === phase.id ? 'Hide' : 'Photos'}
                      </button>
                    )}
                  </div>
                </div>
                <select
                  value={phase.sub_id || ''}
                  onChange={e => assignSub(phase.id, e.target.value)}
                  style={S.select}
                >
                  <option value="">— Assign subcontractor —</option>
                  {subs.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} — {sub.email}</option>
                  ))}
                </select>
              </div>

              {expandedPhase === phase.id && photos[phase.id] && (
                <div style={S.photoSection}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {photos[phase.id].length} photo{photos[phase.id].length !== 1 ? 's' : ''} uploaded
                  </p>
                  {photos[phase.id].length === 0 ? (
                    <p style={{ color: '#4B5563', fontSize: '13px' }}>No photos yet.</p>
                  ) : (
                    <div style={S.photoGrid}>
                      {photos[phase.id].map((photo, i) => (
                        <div key={photo.id}>
                          <img
                            src={photo.storage_url}
                            alt={`Photo ${i + 1}`}
                            style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #2D3139', cursor: 'zoom-in' }}
                            onClick={() => window.open(photo.storage_url, '_blank')}
                          />
                          {photo.note && (
                            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '6px 0 0', fontStyle: 'italic' }}>"{photo.note}"</p>
                          )}
                          <p style={{ fontSize: '11px', color: '#374151', margin: '3px 0 0' }}>
                            {new Date(photo.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        <form onSubmit={addPhase} style={S.addPhaseRow}>
          <input
            type="text"
            value={newPhase}
            onChange={e => setNewPhase(e.target.value)}
            placeholder="Add a phase — e.g. Foundation, Framing, Rough Plumbing..."
            style={S.addPhaseInput}
            onFocus={e => e.target.style.borderColor = '#F97316'}
            onBlur={e => e.target.style.borderColor = '#2D3139'}
          />
          <button type="submit" disabled={loading} style={S.addBtn}>Add</button>
        </form>
      </div>
    </div>
  )
}