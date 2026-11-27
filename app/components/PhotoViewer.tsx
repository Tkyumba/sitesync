'use client'

import { useEffect } from 'react'

type Photo = { id: string; storage_url: string; note?: string | null }

// Full-screen photo viewer that stays inside SiteSync, with a close button,
// previous/next, and Escape / arrow-key support.
export default function PhotoViewer({ photos, index, onClose, onChange }: {
  photos: Photo[]
  index: number
  onClose: () => void
  onChange: (index: number) => void
}) {
  const photo = photos[index]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onChange(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, hasPrev, hasNext, onClose, onChange])

  if (!photo) return null

  const navButton = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute', top: '50%', [side]: '12px', transform: 'translateY(-50%)',
    width: '44px', height: '44px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(17,19,24,0.85)', color: '#F9FAFB', fontSize: '22px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', color: '#9CA3AF', fontSize: '13px' }}
      >
        <button
          onClick={onClose}
          style={{ background: '#1E2128', border: '1px solid #2D3139', borderRadius: '8px', color: '#F9FAFB', padding: '8px 14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
        >
          ← Back
        </button>
        <span>{index + 1} of {photos.length}</span>
        <a
          href={photo.storage_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#60A5FA', fontSize: '13px', textDecoration: 'none' }}
        >
          Open original
        </a>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 64px 16px', minHeight: 0 }}>
        <img
          src={photo.storage_url}
          alt={`Photo ${index + 1}`}
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
        />
        {hasPrev && (
          <button aria-label="Previous photo" onClick={e => { e.stopPropagation(); onChange(index - 1) }} style={navButton('left')}>‹</button>
        )}
        {hasNext && (
          <button aria-label="Next photo" onClick={e => { e.stopPropagation(); onChange(index + 1) }} style={navButton('right')}>›</button>
        )}
      </div>

      {photo.note && (
        <p onClick={e => e.stopPropagation()} style={{ color: '#D1D5DB', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', margin: 0, padding: '0 16px 20px' }}>
          “{photo.note}”
        </p>
      )}
    </div>
  )
}
