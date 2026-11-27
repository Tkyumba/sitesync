import { ImageResponse } from 'next/og'

export const alt = 'SiteSync: Built for home builders'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// The preview card shown when a SiteSync link is texted or shared.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0F1117 0%, #1C1F26 100%)', color: '#FFFFFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div
            style={{
              width: '120px', height: '120px', borderRadius: '28px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
            }}
          >
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div style={{ fontSize: '96px', fontWeight: 700, letterSpacing: '-2px' }}>SiteSync</div>
        </div>
        <div style={{ marginTop: '36px', fontSize: '40px', color: '#9CA3AF' }}>Built for home builders</div>
        <div style={{ marginTop: '18px', fontSize: '28px', color: '#6B7280' }}>Every phase, every sub, every photo, in one place</div>
      </div>
    ),
    size
  )
}
