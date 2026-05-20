'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function JobsPage() {
  const [user, setUser] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [selectedPhotos, setSelectedPhotos] = useState<{ [key: string]: File[] }>({})
  const [previews, setPreviews] = useState<{ [key: string]: string[] }>({})
  const [note, setNote] = useState<{ [key: string]: string }>({})
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    setUser(userData)
    const { data: phaseData } = await supabase
      .from('phases')
      .select('*, projects(name, address)')
      .eq('sub_id', authUser.id)
      .order('order_index', { ascending: true })
    setPhases(phaseData || [])
  }

  async function markStarted(phaseId: string) {
    await supabase.from('phases').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', phaseId)
    await load()
  }

  async function markComplete(phaseId: string) {
    const photos = selectedPhotos[phaseId]
    if (!photos || photos.length === 0) {
      alert('Upload at least one photo before completing.')
      return
    }
    setUploading(phaseId)
    for (const photo of photos) {
      const fileExt = photo.name.split('.').pop()
      const fileName = `${phaseId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('phase-photos').upload(fileName, photo)
      if (uploadError) continue
      const { data: { publicUrl } } = supabase.storage.from('phase-photos').getPublicUrl(fileName)
      await supabase.from('phase_photos').insert({
        phase_id: phaseId, uploaded_by: user.id,
        storage_url: publicUrl, note: note[phaseId] || ''
      })
    }
    await supabase.from('phases').update({ status: 'complete', completed_at: new Date().toISOString() }).eq('id', phaseId)

    // Notify next sub + managers
    const phase = phases.find(p => p.id === phaseId)
    if (phase) {
      fetch('/api/notify-next-sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedPhaseId: phaseId, projectId: phase.project_id })
      }).catch(() => {})
    }

    setUploading(null)
    await load()
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>Loading...</p>
      </div>
    </div>
  )

  const activePhases = phases.filter(p => p.status !== 'complete')
  const completedPhases = phases.filter(p => p.status === 'complete')

  return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', fontFamily: "'DM Sans', -apple-system, sans-serif", paddingBottom: '40px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* Nav */}
      <nav style={{ background: '#111318', borderBottom: '1px solid #1E2128', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>SiteSync</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{user.name}</span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ background: 'none', border: '1px solid #1E2128', borderRadius: '8px', padding: '5px 10px', color: '#6B7280', fontSize: '12px', cursor: 'pointer' }}>Out</button>
        </div>
      </nav>

      <div style={{ padding: '20px 16px', maxWidth: '560px', margin: '0 auto' }}>

        {/* Greeting */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#F9FAFB', margin: '0 0 3px', letterSpacing: '-0.4px' }}>
            Hey, {user.name.split(' ')[0]}.
          </h1>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            {activePhases.length > 0
              ? `You have ${activePhases.length} active job${activePhases.length !== 1 ? 's' : ''} — let's get it done.`
              : 'All caught up. No active jobs right now.'}
          </p>
        </div>

        {/* Active phases */}
        {activePhases.length === 0 && completedPhases.length === 0 && (
          <div style={{ background: '#111318', border: '1px dashed #1E2128', borderRadius: '14px', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }}>🏗</p>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 4px', fontWeight: '600' }}>No jobs assigned yet</p>
            <p style={{ color: '#374151', fontSize: '12px', margin: 0 }}>Your manager will assign you to a phase soon</p>
          </div>
        )}

        {activePhases.map(phase => {
          const isActive = phase.status === 'in_progress'
          const isNotStarted = phase.status === 'not_started'
          const hasPhotos = (selectedPhotos[phase.id] || []).length > 0
          const isUploading = uploading === phase.id

          return (
            <div key={phase.id} style={{
              background: isActive ? '#0D1520' : '#111318',
              border: `1px solid ${isActive ? '#1D4ED8' : '#1E2128'}`,
              borderRadius: '16px', padding: '20px',
              marginBottom: '12px', animation: 'fadeIn 0.3s ease'
            }}>
              {/* Phase header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '11px', color: '#4B5563', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600', fontFamily: "'DM Mono', monospace" }}>
                    {phase.projects?.name}
                  </p>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#F9FAFB', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
                    {phase.name}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#4B5563', margin: 0, fontFamily: "'DM Mono', monospace" }}>
                    {phase.projects?.address}
                  </p>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: '600', flexShrink: 0, marginLeft: '12px', marginTop: '2px',
                  color: isActive ? '#60A5FA' : '#6B7280',
                  background: isActive ? '#0F1929' : '#1A1C22',
                  border: `1px solid ${isActive ? '#1D4ED8' : '#2D3139'}`,
                  borderRadius: '99px', padding: '4px 10px'
                }}>
                  {isActive ? '● In progress' : 'Not started'}
                </span>
              </div>

              <div style={{ height: '1px', background: '#1E2128', margin: '16px 0' }} />

              {/* Not started — big start button */}
              {isNotStarted && (
                <button onClick={() => markStarted(phase.id)} style={{
                  width: '100%', background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  border: 'none', borderRadius: '12px', padding: '16px',
                  color: '#FFF', fontSize: '15px', fontWeight: '700',
                  cursor: 'pointer', letterSpacing: '-0.2px',
                  boxShadow: '0 4px 20px rgba(59,130,246,0.3)'
                }}>
                  Start This Job
                </button>
              )}

              {/* In progress — photo upload + complete */}
              {isActive && (
                <div>
                  {/* Photo previews */}
                  {(previews[phase.id] || []).length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      {previews[phase.id].map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #1E2128', display: 'block' }} />
                          <button onClick={() => {
                            const updatedPhotos = (selectedPhotos[phase.id] || []).filter((_, j) => j !== i)
                            const updatedPreviews = (previews[phase.id] || []).filter((_, j) => j !== i)
                            setSelectedPhotos(prev => ({ ...prev, [phase.id]: updatedPhotos }))
                            setPreviews(prev => ({ ...prev, [phase.id]: updatedPreviews }))
                          }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', color: '#EF4444', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload area */}
                  <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    width: '100%', boxSizing: 'border-box', minHeight: '100px',
                    border: `2px dashed ${hasPhotos ? '#166534' : '#1E2128'}`,
                    borderRadius: '12px', cursor: 'pointer',
                    background: hasPhotos ? '#0A1F0A' : '#0A0C10',
                    marginBottom: '10px', padding: '16px', transition: 'all 0.2s'
                  }}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>📷</div>
                    <p style={{ color: hasPhotos ? '#4ADE80' : '#9CA3AF', fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>
                      {hasPhotos ? `${selectedPhotos[phase.id].length} photo${selectedPhotos[phase.id].length !== 1 ? 's' : ''} selected` : 'Tap to upload photos'}
                    </p>
                    <p style={{ color: '#374151', fontSize: '11px', margin: 0 }}>Required before you can complete</p>
                    <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files || [])
                        if (files.length > 0) {
                          const existing = selectedPhotos[phase.id] || []
                          const existingPreviews = previews[phase.id] || []
                          const newUrls = files.map(f => URL.createObjectURL(f))
                          setSelectedPhotos(prev => ({ ...prev, [phase.id]: [...existing, ...files] }))
                          setPreviews(prev => ({ ...prev, [phase.id]: [...existingPreviews, ...newUrls] }))
                        }
                      }}
                    />
                  </label>

                  {/* Note */}
                  <textarea
                    value={note[phase.id] || ''}
                    onChange={e => setNote(prev => ({ ...prev, [phase.id]: e.target.value }))}
                    placeholder="Any notes? (issues found, flagged items, etc.) — optional"
                    rows={2}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#0A0C10', border: '1px solid #1E2128',
                      borderRadius: '10px', padding: '10px 14px',
                      color: '#F9FAFB', fontSize: '13px', outline: 'none',
                      resize: 'none', marginBottom: '10px', fontFamily: "'DM Sans', sans-serif"
                    }}
                  />

                  {/* Complete button */}
                  <button
                    onClick={() => markComplete(phase.id)}
                    disabled={isUploading || !hasPhotos}
                    style={{
                      width: '100%',
                      background: isUploading ? '#14532D' : hasPhotos ? 'linear-gradient(135deg, #22C55E, #16A34A)' : '#1A1C22',
                      border: 'none', borderRadius: '12px', padding: '16px',
                      color: hasPhotos ? '#FFFFFF' : '#4B5563',
                      fontSize: '15px', fontWeight: '700',
                      cursor: hasPhotos && !isUploading ? 'pointer' : 'not-allowed',
                      boxShadow: hasPhotos ? '0 4px 20px rgba(34,197,94,0.25)' : 'none',
                      transition: 'all 0.2s', letterSpacing: '-0.2px'
                    }}
                  >
                    {isUploading
                      ? `Uploading ${selectedPhotos[phase.id]?.length} photo${selectedPhotos[phase.id]?.length !== 1 ? 's' : ''}...`
                      : hasPhotos ? '✓ Submit & Complete Phase' : 'Upload a photo to complete'}
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Completed phases */}
        {completedPhases.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#374151', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Completed</p>
            {completedPhases.map(phase => (
              <div key={phase.id} style={{ background: '#0A1F0A', border: '1px solid #166534', borderRadius: '12px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '11px', color: '#4B5563', margin: '0 0 2px', fontFamily: "'DM Mono', monospace" }}>{phase.projects?.name}</p>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#4ADE80', margin: 0 }}>{phase.name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '11px', color: '#166534', margin: 0, fontFamily: "'DM Mono', monospace" }}>
                    ✓ {new Date(phase.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
