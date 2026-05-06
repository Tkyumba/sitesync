'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function SubPage() {
  const { slug } = useParams()
  const [user, setUser] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('slug', slug)
        .single()

      if (!userData) { setLoading(false); return }
      setUser(userData)

      const { data: phaseData } = await supabase
        .from('phases')
        .select('*, projects(name)')
        .eq('assigned_sub_id', userData.id)
        .order('created_at', { ascending: false })

      setPhases(phaseData || [])
      setLoading(false)
    }
    load()
  }, [slug])

  async function uploadPhoto(phaseId: string, file: File) {
    const path = `${phaseId}/${Date.now()}_${file.name}`
    await supabase.storage.from('phase-photos').upload(path, file)
    const { data: { publicUrl } } = supabase.storage.from('phase-photos').getPublicUrl(path)
    await supabase.from('phase_photos').insert({ phase_id: phaseId, storage_url: publicUrl, uploaded_by: user.id })
    alert('Photo uploaded!')
  }

  async function markComplete(phaseId: string) {
    await supabase.from('phases').update({ status: 'complete' }).eq('id', phaseId)
    setPhases(prev => prev.map(p => p.id === phaseId ? { ...p, status: 'complete' } : p))
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading...</div>
  if (!user) return <div style={{ minHeight: '100vh', background: '#0F1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Link not found.</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#1C1F26', borderBottom: '1px solid #2D3139', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: '600', fontSize: '16px' }}>SiteSync</div>
          <div style={{ color: '#6B7280', fontSize: '12px' }}>Hey {user.name} 👋</div>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Your Assigned Phases</h2>

        {phases.length === 0 && <p style={{ color: '#6B7280' }}>No phases assigned yet.</p>}

        {phases.map(phase => (
          <div key={phase.id} style={{ background: '#1C1F26', border: '1px solid #2D3139', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
            <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '4px' }}>{phase.projects?.name}</div>
            <div style={{ color: '#fff', fontWeight: '600', fontSize: '16px', marginBottom: '8px' }}>{phase.name}</div>
            <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', marginBottom: '12px',
              background: phase.status === 'complete' ? '#052e16' : '#1c1917',
              color: phase.status === 'complete' ? '#4ade80' : '#f97316',
              border: `1px solid ${phase.status === 'complete' ? '#166534' : '#7c2d12'}`
            }}>
              {phase.status === 'complete' ? '✓ Complete' : 'In Progress'}
            </div>

            {phase.status !== 'complete' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ background: '#F97316', color: '#fff', padding: '10px', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  📷 Upload Photo
                  <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && uploadPhoto(phase.id, e.target.files[0])} />
                </label>
                <button onClick={() => markComplete(phase.id)}
                  style={{ background: '#052e16', border: '1px solid #166534', color: '#4ade80', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                  ✓ Mark as Complete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
