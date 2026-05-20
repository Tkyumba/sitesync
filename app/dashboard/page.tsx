'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [allPhases, setAllPhases] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(userData)
    const { data: projectData } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(projectData || [])
    const { data: phaseData } = await supabase.from('phases').select('*, projects(name)')
    setAllPhases(phaseData || [])
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ color: '#4B5563' }}>Loading...</p>
    </div>
  )

  const activeProjects = projects.filter(p => p.status === 'active')
  const inProgress = allPhases.filter(p => p.status === 'in_progress').length
  const completedToday = allPhases.filter(p => {
    if (p.status !== 'complete' || !p.completed_at) return false
    const d = new Date(p.completed_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  }).length
  const unassigned = allPhases.filter(p => !p.sub_id && p.status === 'not_started').length

  // Manager gets full working view, owner gets overview
  const isManager = user.role === 'manager' || user.role === 'vp'

  return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ background: '#111318', borderBottom: '1px solid #1E2128', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.3px' }}>SiteSync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontFamily: "'DM Mono', monospace" }}>{user.name}</span>
          <span style={{ background: isManager ? '#1A1F2E' : '#1F1A10', border: `1px solid ${isManager ? '#2D4ED8' : '#EA580C'}`, borderRadius: '99px', padding: '3px 10px', fontSize: '11px', fontWeight: '600', color: isManager ? '#60A5FA' : '#F97316', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{user.role}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ background: 'none', border: '1px solid #1E2128', borderRadius: '8px', padding: '5px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>Sign out</button>
        </div>
      </nav>

      <div style={{ padding: '28px', maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            {isManager ? 'Operations Hub' : 'Overview'}
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            {isManager ? 'Manage all active builds and subcontractor assignments.' : 'High-level status across all Legacy Homes builds.'}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Active Builds', value: activeProjects.length, color: '#F97316', accent: '#7C2D12' },
            { label: 'Phases In Progress', value: inProgress, color: '#3B82F6', accent: '#1E3A5F' },
            { label: 'Completed Today', value: completedToday, color: '#22C55E', accent: '#14532D' },
            { label: 'Unassigned Phases', value: unassigned, color: unassigned > 0 ? '#EF4444' : '#6B7280', accent: unassigned > 0 ? '#7F1D1D' : '#1F2128' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '12px', padding: '16px 20px' }}>
              <p style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.label}</p>
              <p style={{ fontSize: '30px', fontWeight: '700', color: s.color, margin: 0, letterSpacing: '-1px', fontFamily: "'DM Mono', monospace" }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#9CA3AF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>All Projects</h2>
          {isManager && (
            <button onClick={() => router.push('/dashboard/new-project')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '9px', padding: '8px 16px', color: '#FFFFFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              + New Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div style={{ background: '#111318', border: '1px dashed #1E2128', borderRadius: '14px', padding: '60px', textAlign: 'center' }}>
            <p style={{ color: '#4B5563', fontSize: '14px', margin: 0 }}>No projects yet. Create your first build.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {projects.map(project => {
              const projectPhases = allPhases.filter(ph => ph.project_id === project.id)
              const done = projectPhases.filter(ph => ph.status === 'complete').length
              const pct = projectPhases.length > 0 ? Math.round((done / projectPhases.length) * 100) : 0
              const activePhase = projectPhases.find(ph => ph.status === 'in_progress')

              return (
                <div key={project.id}
                  onClick={() => router.push(`/dashboard/project/${project.id}`)}
                  style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '12px', padding: '16px 20px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '16px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#F97316')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2128')}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <p style={{ fontSize: '15px', fontWeight: '600', color: '#F9FAFB', margin: 0 }}>{project.name}</p>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: project.status === 'active' ? '#22C55E' : project.status === 'complete' ? '#818CF8' : '#6B7280', background: project.status === 'active' ? '#14532D' : project.status === 'complete' ? '#1E1B4B' : '#1F2128', border: `1px solid ${project.status === 'active' ? '#166534' : project.status === 'complete' ? '#3730A3' : '#374151'}`, borderRadius: '99px', padding: '2px 9px' }}>
                        {project.status === 'active' ? '● Live' : project.status === 'complete' ? '✓ Done' : 'Inactive'}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: '0 0 8px', fontFamily: "'DM Mono', monospace" }}>{project.address} · {project.client_name}</p>
                    {projectPhases.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, height: '4px', background: '#1E2128', borderRadius: '99px', overflow: 'hidden', maxWidth: '200px' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22C55E' : 'linear-gradient(90deg, #F97316, #FBBF24)', borderRadius: '99px', transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#4B5563', fontFamily: "'DM Mono', monospace" }}>{done}/{projectPhases.length} phases</span>
                        {activePhase && <span style={{ fontSize: '11px', color: '#3B82F6' }}>▸ {activePhase.name}</span>}
                      </div>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
