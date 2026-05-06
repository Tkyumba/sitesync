'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  navUser: { fontSize: '13px', color: '#6B7280' },
  navBadge: {
    background: '#1A2B1A', border: '1px solid #166534',
    borderRadius: '20px', padding: '3px 10px',
    fontSize: '11px', fontWeight: '600', color: '#4ADE80'
  },
  signOut: {
    background: 'none', border: '1px solid #2D3139',
    borderRadius: '8px', padding: '6px 12px',
    color: '#6B7280', fontSize: '13px', cursor: 'pointer'
  },
  body: { padding: '24px', maxWidth: '1200px', margin: '0 auto' },
  pageTitle: { fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 4px' },
  pageSubtitle: { fontSize: '13px', color: '#6B7280', margin: '0 0 24px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '28px' },
  statCard: {
    background: '#1C1F26', border: '1px solid #2D3139',
    borderRadius: '12px', padding: '16px 20px'
  },
  statLabel: { fontSize: '12px', color: '#6B7280', fontWeight: '500', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  statVal: { fontSize: '28px', fontWeight: '700', margin: 0 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' },
  sectionTitle: { fontSize: '15px', fontWeight: '600', color: '#FFFFFF', margin: 0 },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'linear-gradient(135deg, #F97316, #EA580C)',
    border: 'none', borderRadius: '9px', padding: '8px 16px',
    color: '#FFFFFF', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
  },
  emptyCard: {
    background: '#1C1F26', border: '1px dashed #2D3139',
    borderRadius: '14px', padding: '48px',
    textAlign: 'center' as const
  },
  emptyTitle: { color: '#6B7280', fontSize: '15px', margin: '0 0 6px' },
  emptyDesc: { color: '#374151', fontSize: '13px', margin: 0 },
  projectCard: {
    background: '#1C1F26', border: '1px solid #2D3139',
    borderRadius: '14px', padding: '18px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
    marginBottom: '10px'
  },
  projectName: { fontSize: '15px', fontWeight: '600', color: '#FFFFFF', margin: '0 0 4px' },
  projectAddr: { fontSize: '13px', color: '#6B7280', margin: 0 },
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
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
    }
    load()
  }, [])

  if (!user) return (
    <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }}></div>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading SiteSync...</p>
      </div>
    </div>
  )

  const activeCount = projects.filter(p => p.status === 'active').length
  const inactiveCount = projects.filter(p => p.status === 'inactive').length

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
        <div style={S.navRight}>
          <span style={S.navUser}>{user.name}</span>
          <span style={S.navBadge}>{user.role}</span>
          <button style={S.signOut} onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={S.body}>
        <p style={S.pageTitle}>Good morning, {user.name.split(' ')[0]}.</p>
        <p style={S.pageSubtitle}>Here's what's happening across your builds today.</p>

        <div style={S.statsGrid}>
          <div style={S.statCard}>
            <p style={S.statLabel}>Active builds</p>
            <p style={{ ...S.statVal, color: '#F97316' }}>{activeCount}</p>
          </div>
          <div style={S.statCard}>
            <p style={S.statLabel}>Phases in progress</p>
            <p style={{ ...S.statVal, color: '#3B82F6' }}>0</p>
          </div>
          <div style={S.statCard}>
            <p style={S.statLabel}>Completed today</p>
            <p style={{ ...S.statVal, color: '#22C55E' }}>0</p>
          </div>
          <div style={S.statCard}>
            <p style={S.statLabel}>Issues flagged</p>
            <p style={{ ...S.statVal, color: '#EF4444' }}>0</p>
          </div>
        </div>

        <div style={S.sectionHead}>
          <p style={S.sectionTitle}>Active Projects ({projects.length})</p>
          <button style={S.newBtn} onClick={() => router.push('/dashboard/new-project')}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div style={S.emptyCard}>
            <p style={S.emptyTitle}>No projects yet</p>
            <p style={S.emptyDesc}>Create your first project to get started</p>
          </div>
        ) : (
          <div>
            {projects.map(project => (
              <div
                key={project.id}
                style={{
                  ...S.projectCard,
                  borderColor: hovered === project.id ? '#F97316' : '#2D3139',
                  background: hovered === project.id ? '#1F2330' : '#1C1F26'
                }}
                onClick={() => router.push(`/dashboard/project/${project.id}`)}
                onMouseEnter={() => setHovered(project.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px', height: '40px',
                    background: project.status === 'active' ? '#1A2B1A' : '#1A1A2B',
                    borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={project.status === 'active' ? '#22C55E' : '#6B7280'} strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                  <div>
                    <p style={S.projectName}>{project.name}</p>
                    <p style={S.projectAddr}>{project.address} — {project.client_name}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    background: project.status === 'active' ? '#1A2B1A' : '#1F1F1F',
                    border: `1px solid ${project.status === 'active' ? '#166534' : '#374151'}`,
                    borderRadius: '20px', padding: '4px 12px',
                    fontSize: '12px', fontWeight: '600',
                    color: project.status === 'active' ? '#4ADE80' : '#6B7280',
                    textTransform: 'capitalize' as const
                  }}>
                    {project.status === 'active' ? '● Live' : project.status}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}