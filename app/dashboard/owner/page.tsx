'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OwnerPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [phases, setPhases] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
      setUser(userData)
      const { data: projectData } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      setProjects(projectData || [])
      const { data: phaseData } = await supabase.from('phases').select('*')
      setPhases(phaseData || [])
    }
    load()
  }, [])

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <nav style={{ background: '#1C1F26', borderBottom: '1px solid #2D3139', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF' }}>SiteSync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>{user.name}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ background: 'none', border: '1px solid #2D3139', borderRadius: '8px', padding: '6px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 4px' }}>Good morning, {user.name.split(' ')[0]}.</p>
        <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 28px' }}>Here's a live view of your builds.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Active Builds', value: projects.filter(p => p.status === 'active').length, color: '#F97316' },
            { label: 'Phases Complete', value: phases.filter(p => p.status === 'complete').length, color: '#22C55E' },
            { label: 'In Progress', value: phases.filter(p => p.status === 'in_progress').length, color: '#3B82F6' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#1C1F26', border: '1px solid #2D3139', borderRadius: '12px', padding: '16px 20px' }}>
              <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ fontSize: '28px', fontWeight: '700', color: stat.color, margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '15px', fontWeight: '600', color: '#FFFFFF', margin: '0 0 14px' }}>All Projects</p>

        {projects.map(project => {
          const projectPhases = phases.filter(p => p.project_id === project.id)
          const completed = projectPhases.filter(p => p.status === 'complete').length
          const total = projectPhases.length
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0

          return (
            <div key={project.id} style={{ background: '#1C1F26', border: '1px solid #2D3139', borderRadius: '14px', padding: '20px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#FFFFFF', margin: '0 0 4px' }}>{project.name}</p>
                  <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{project.address} · {project.client_name}</p>
                </div>
                <span style={{
                  background: project.status === 'active' ? '#1A2B1A' : '#1F1F1F',
                  border: `1px solid ${project.status === 'active' ? '#166534' : '#374151'}`,
                  borderRadius: '20px', padding: '4px 12px',
                  fontSize: '12px', fontWeight: '600',
                  color: project.status === 'active' ? '#4ADE80' : '#6B7280'
                }}>
                  {project.status === 'active' ? '🟢 Live' : project.status}
                </span>
              </div>

              {total > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>{completed} of {total} phases complete</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#F97316' }}>{pct}%</span>
                  </div>
                  <div style={{ height: '5px', background: '#2D3139', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #F97316, #22C55E)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginTop: '12px' }}>
                    {projectPhases.map(phase => (
                      <span key={phase.id} style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                        background: phase.status === 'complete' ? '#1A2B1A' : phase.status === 'in_progress' ? '#1A1F2E' : '#1F1F1F',
                        border: `1px solid ${phase.status === 'complete' ? '#166534' : phase.status === 'in_progress' ? '#1D4ED8' : '#374151'}`,
                        color: phase.status === 'complete' ? '#4ADE80' : phase.status === 'in_progress' ? '#3B82F6' : '#6B7280'
                      }}>
                        {phase.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}