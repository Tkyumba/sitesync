'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'

export default function JobPage() {
  const [job, setJob] = useState<any>(null)
  const [phase, setPhase] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [status, setStatus] = useState<'loading' | 'invalid' | 'expired' | 'ready' | 'started' | 'complete'>('loading')
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const supabase = createClient()
  const params = useParams()
  const token = params.token as string

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch(`/api/job/${encodeURIComponent(token)}`, { cache: 'no-store' }).catch(() => null)
    if (!res) { setStatus('invalid'); return }
    if (res.status === 410) { setStatus('expired'); return }
    if (!res.ok) { setStatus('invalid'); return }
    const data = await res.json()

    setJob({ sub_name: data.subName })
    setPhase(data.phase)
    setProject(data.project)

    if (data.phase?.status === 'complete') setStatus('complete')
    else if (data.phase?.status === 'in_progress') setStatus('started')
    else setStatus('ready')
  }

  async function markStarted() {
    const res = await fetch(`/api/job/${encodeURIComponent(token)}/start`, { method: 'POST' }).catch(() => null)
    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {}
      alert(body?.error || 'Could not start the job. Check your connection and try again.')
      return
    }
    setStatus('started')
    setPhase((prev: any) => ({ ...prev, status: 'in_progress' }))
  }

  async function markComplete() {
    if (selectedPhotos.length === 0) return
    setUploading(true)
    const fail = (message: string) => {
      setUploading(false)
      alert(`${message}\n\nThe job was not marked complete.`)
    }

    // 1. Ask the server for one-time upload slots for this job
    const slotRes = await fetch(`/api/job/${encodeURIComponent(token)}/upload-urls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: selectedPhotos.map(f => ({ name: f.name })) })
    }).catch(() => null)
    const slotBody = slotRes ? await slotRes.json().catch(() => ({})) : {}
    if (!slotRes || !slotRes.ok) return fail(slotBody?.error || 'Could not prepare your photo upload.')

    // 2. Upload each photo into its slot
    const slots: { path: string; token: string }[] = slotBody.slots
    for (let i = 0; i < selectedPhotos.length; i++) {
      const photo = selectedPhotos[i]
      const { error } = await supabase.storage.from('phase-photos').uploadToSignedUrl(slots[i].path, slots[i].token, photo, { contentType: photo.type || undefined })
      if (error) {
        console.error('[job] photo upload failed', error)
        return fail(`"${photo.name}" did not upload (${error.message}). Please try again.`)
      }
    }

    // 3. Submit the photos and mark the job complete
    const doneRes = await fetch(`/api/job/${encodeURIComponent(token)}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: slots.map(s => s.path), note })
    }).catch(() => null)
    const doneBody = doneRes ? await doneRes.json().catch(() => ({})) : {}
    if (!doneRes || !doneRes.ok) return fail(doneBody?.error || 'Could not submit your photos.')

    setUploading(false)
    setStatus('complete')
  }

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #F97316', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )

  if (status === 'invalid') return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔗</p>
        <h1 style={{ color: '#F9FAFB', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Invalid link</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>This job link is invalid. Contact your manager.</p>
      </div>
    </div>
  )

  if (status === 'expired') return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '48px', margin: '0 0 16px' }}>⏰</p>
        <h1 style={{ color: '#F9FAFB', fontSize: '20px', fontWeight: '700', margin: '0 0 8px' }}>Link expired</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>This link has expired. Ask your manager to resend it.</p>
      </div>
    </div>
  )

  if (status === 'complete') return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '24px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '64px', height: '64px', background: '#0A1F0A', border: '2px solid #166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✓</div>
        <h1 style={{ color: '#4ADE80', fontSize: '24px', fontWeight: '700', margin: '0 0 8px' }}>Phase Complete!</h1>
        <p style={{ color: '#9CA3AF', fontSize: '14px', margin: '0 0 4px' }}>{phase?.name} on</p>
        <p style={{ color: '#F9FAFB', fontSize: '16px', fontWeight: '600', margin: 0 }}>{project?.name}</p>
        <p style={{ color: '#4B5563', fontSize: '12px', margin: '20px 0 0' }}>Your manager has been notified. Great work!</p>
      </div>
    </div>
  )

  const hasPhotos = selectedPhotos.length > 0

  return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', fontFamily: "'DM Sans', -apple-system, sans-serif", paddingBottom: '40px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <nav style={{ background: '#111318', borderBottom: '1px solid #1E2128', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>SiteSync</span>
        </div>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>Hey, {job?.sub_name} 👋</span>
      </nav>

      <div style={{ padding: '24px 16px', maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '11px', color: '#4B5563', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '600', fontFamily: "'DM Mono', monospace" }}>
            {project?.name}
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#F9FAFB', margin: '0 0 2px', letterSpacing: '-0.4px' }}>{phase?.name}</h1>
          <p style={{ fontSize: '13px', color: '#4B5563', margin: 0, fontFamily: "'DM Mono', monospace" }}>{project?.address}</p>
        </div>

        {status === 'ready' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#22C55E' }}>Previous phase complete — you're up next</span>
            </div>
            <div style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              {[
                { label: 'Phase', value: phase?.name },
                { label: 'Project', value: project?.name },
                { label: 'Address', value: project?.address },
              ].map(row => row.value && (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1A1C22' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{row.label}</span>
                  <span style={{ fontSize: '12px', color: '#F9FAFB', fontWeight: '500' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 20px', lineHeight: 1.6 }}>
              Tap the button below when you arrive on site. You'll upload photos and mark complete when done.
            </p>
            <button onClick={markStarted} style={{ width: '100%', background: '#2563EB', border: 'none', borderRadius: '14px', padding: '18px', color: '#FFF', fontSize: '16px', fontWeight: '500', cursor: 'pointer' }}>
              I'm on site — Start Job
            </button>
            <p style={{ fontSize: '10px', color: '#374151', margin: '12px 0 0', textAlign: 'center' }}>This link is unique to you · No login needed</p>
          </div>
        )}

        {status === 'started' && (
          <div style={{ background: '#0D1520', border: '1px solid #1D4ED8', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3B82F6' }} />
              <span style={{ fontSize: '13px', color: '#60A5FA', fontWeight: '600' }}>In progress</span>
            </div>
            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {previews.map((url, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #1E2128', display: 'block' }} />
                    <button onClick={() => {
                      setSelectedPhotos(prev => prev.filter((_, j) => j !== i))
                      setPreviews(prev => prev.filter((_, j) => j !== i))
                    }} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', color: '#EF4444', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', boxSizing: 'border-box', minHeight: '110px', border: `2px dashed ${hasPhotos ? '#166534' : '#1E2128'}`, borderRadius: '12px', cursor: 'pointer', background: hasPhotos ? '#0A1F0A' : '#0A0C10', marginBottom: '12px', padding: '16px', transition: 'all 0.2s' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>📷</div>
              <p style={{ color: hasPhotos ? '#4ADE80' : '#9CA3AF', fontSize: '14px', fontWeight: '600', margin: '0 0 2px' }}>
                {hasPhotos ? `${selectedPhotos.length} photo${selectedPhotos.length !== 1 ? 's' : ''} ready` : 'Tap to add photos'}
              </p>
              <p style={{ color: '#374151', fontSize: '11px', margin: 0 }}>{hasPhotos ? 'Tap to add more · select several at once' : 'Required · you can add several'}</p>
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={e => {
                  const files = Array.from(e.target.files || [])
                  if (files.length > 0) {
                    setSelectedPhotos(prev => [...prev, ...files])
                    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))])
                  }
                  // Reset so the sub can tap again to add more photos (including the same file)
                  e.target.value = ''
                }}
              />
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Any notes? Issues found, items flagged... (optional)"
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box', background: '#0A0C10', border: '1px solid #1E2128', borderRadius: '10px', padding: '10px 14px', color: '#F9FAFB', fontSize: '13px', outline: 'none', resize: 'none', marginBottom: '12px', fontFamily: "'DM Sans', sans-serif" }}
            />
            <button
              onClick={markComplete}
              disabled={uploading || !hasPhotos}
              style={{ width: '100%', background: uploading ? '#14532D' : hasPhotos ? 'linear-gradient(135deg, #22C55E, #16A34A)' : '#1A1C22', border: 'none', borderRadius: '14px', padding: '18px', color: hasPhotos ? '#FFF' : '#4B5563', fontSize: '16px', fontWeight: '700', cursor: hasPhotos && !uploading ? 'pointer' : 'not-allowed', boxShadow: hasPhotos ? '0 4px 20px rgba(34,197,94,0.25)' : 'none', transition: 'all 0.2s' }}
            >
              {uploading ? 'Submitting...' : hasPhotos ? '✓ Submit & Complete' : 'Add a photo to complete'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}