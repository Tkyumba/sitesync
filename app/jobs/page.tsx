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
  navUser: { fontSize: '13px', color: '#6B7280' },
  signOut: {
    background: 'none', border: '1px solid #2D3139',
    borderRadius: '8px', padding: '6px 12px',
    color: '#6B7280', fontSize: '13px', cursor: 'pointer'
  },
  body: { padding: '24px', maxWidth: '560px', margin: '0 auto' },
  greeting: { fontSize: '22px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 4px' },
  subGreeting: { fontSize: '14px', color: '#6B7280', margin: '0 0 28px' },
  emptyCard: {
    background: '#1C1F26', border: '1px dashed #2D3139',
    borderRadius: '14px', padding: '48px', textAlign: 'center' as const
  },
}

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    setUser(userData)
    const { data: phaseData } = await supabase
      .from('phases')
      .select('*, projects(name, address)')
      .eq('sub_id', user.id)
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
      alert('Please upload at least one photo before marking complete.')
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
    setUploading(null)
    await load()
  }

  if (!user) return (
    <div style={{ ...S.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  const activePhases = phases.filter(p => p.status !== 'complete')
  const completedPhases = phases.filter(p => p.status === 'complete')

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={S.navUser}>{user.name}</span>
          <button style={S.signOut} onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
            Sign out
          </button>
        </div>
      </nav>

      <div style={S.body}>
        <p style={S.greeting}>Hey, {user.name.split(' ')[0]}.</p>
        <p style={S.subGreeting}>
          {activePhases.length > 0
            ? `You have ${activePhases.length} active job${activePhases.length > 1 ? 's' : ''}.`
            : 'All caught up — no active jobs right now.'}
        </p>

        {phases.length === 0 ? (
          <div style={S.emptyCard}>
            <p style={{ color: '#6B7280', fontSize: '15px', margin: '0 0 6px' }}>No jobs assigned yet</p>
            <p style={{ color: '#374151', fontSize: '13px', margin: 0 }}>You'll see your jobs here once assigned</p>
          </div>
        ) : (
          <div>
            {phases.map(phase => {
              const isActive = phase.status === 'in_progress'
              const isComplete = phase.status === 'complete'
              const isNotStarted = phase.status === 'not_started'
              const hasPhotos = (selectedPhotos[phase.id] || []).length > 0

              return (
                <div key={phase.id} style={{
                  background: isComplete ? '#111A11' : isActive ? '#111520' : '#1C1F26',
                  border: `1px solid ${isComplete ? '#166534' : isActive ? '#1D4ED8' : '#2D3139'}`,
                  borderRadius: '14px', padding: '18px 20px',
                  marginBottom: '12px'
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B7280', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {phase.projects?.name}
                      </p>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', margin: 0 }}>
                        {phase.name}
                      </p>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '600',
                      color: isComplete ? '#22C55E' : isActive ? '#3B82F6' : '#6B7280',
                      background: isComplete ? '#1A2B1A' : isActive ? '#1A1F2E' : '#1F1F1F',
                      border: `1px solid ${isComplete ? '#166534' : isActive ? '#1D4ED8' : '#374151'}`,
                      borderRadius: '20px', padding: '4px 12px'
                    }}>
                      {isComplete ? '✓ Complete' : isActive ? '● In progress' : 'Not started'}
                    </span>
                  </div>

                  <p style={{ fontSize: '12px', color: '#4B5563', margin: '0 0 16px' }}>
                    {phase.projects?.address}
                  </p>

                  {/* Actions */}
                  {isNotStarted && (
                    <button
                      onClick={() => markStarted(phase.id)}
                      style={{
                        width: '100%', background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                        border: 'none', borderRadius: '10px', padding: '13px',
                        color: '#FFFFFF', fontSize: '14px', fontWeight: '600',
                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                      }}
                    >
                      Mark as Started
                    </button>
                  )}

                  {isActive && (
                    <div>
                      {/* Photo previews */}
                      {(previews[phase.id] || []).length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                          {previews[phase.id].map((url, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <img src={url} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #2D3139' }} />
                              <button
                                onClick={() => {
                                  const updatedPhotos = (selectedPhotos[phase.id] || []).filter((_, j) => j !== i)
                                  const updatedPreviews = (previews[phase.id] || []).filter((_, j) => j !== i)
                                  setSelectedPhotos(prev => ({ ...prev, [phase.id]: updatedPhotos }))
                                  setPreviews(prev => ({ ...prev, [phase.id]: updatedPreviews }))
                                }}
                                style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', color: '#EF4444', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >×</button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload area */}
                      <label style={{
                        display: 'flex', flexDirection: 'column' as const,
                        alignItems: 'center', justifyContent: 'center',
                        width: '100%', boxSizing: 'border-box' as const,
                        height: '90px', border: '2px dashed #2D3139',
                        borderRadius: '10px', cursor: 'pointer',
                        background: '#0F1117', marginBottom: '10px',
                        transition: 'border-color 0.2s'
                      }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" style={{ marginBottom: '6px' }}>
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0 }}>
                          {hasPhotos ? `${selectedPhotos[phase.id].length} photo${selectedPhotos[phase.id].length > 1 ? 's' : ''} — tap to add more` : 'Upload completion photos'}
                        </p>
                        <p style={{ color: '#4B5563', fontSize: '11px', margin: '3px 0 0' }}>Required before completing</p>
                        <input type="file" accept="image/*" multiple className="hidden" style={{ display: 'none' }}
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
                        placeholder="Add a note — e.g. issue found, flagged for review (optional)"
                        rows={2}
                        style={{
                          width: '100%', boxSizing: 'border-box' as const,
                          background: '#0F1117', border: '1px solid #2D3139',
                          borderRadius: '10px', padding: '10px 14px',
                          color: '#FFFFFF', fontSize: '13px', outline: 'none',
                          resize: 'none' as const, marginBottom: '10px'
                        }}
                      />

                      {/* Submit */}
                      <button
                        onClick={() => markComplete(phase.id)}
                        disabled={uploading === phase.id || !hasPhotos}
                        style={{
                          width: '100%',
                          background: hasPhotos ? 'linear-gradient(135deg, #22C55E, #16A34A)' : '#1A2B1A',
                          border: 'none', borderRadius: '10px', padding: '13px',
                          color: hasPhotos ? '#FFFFFF' : '#4B5563',
                          fontSize: '14px', fontWeight: '600',
                          cursor: hasPhotos ? 'pointer' : 'not-allowed',
                          boxShadow: hasPhotos ? '0 4px 12px rgba(34,197,94,0.3)' : 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {uploading === phase.id
                          ? `Uploading ${selectedPhotos[phase.id]?.length} photo${selectedPhotos[phase.id]?.length > 1 ? 's' : ''}...`
                          : hasPhotos ? 'Submit & Mark Complete' : 'Upload a photo to complete'}
                      </button>
                    </div>
                  )}

                  {isComplete && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E' }}></div>
                      <p style={{ color: '#4ADE80', fontSize: '13px', margin: 0 }}>
                        Completed {new Date(phase.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}