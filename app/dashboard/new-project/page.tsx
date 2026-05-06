'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('projects').insert({
      name, client_name: clientName, address,
      owner_id: user.id, status: 'inactive'
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1117', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <nav style={{
        background: '#1C1F26', borderBottom: '1px solid #2D3139',
        padding: '0 24px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky' as const, top: 0, zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.3px' }}>SiteSync</span>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: '1px solid #2D3139', borderRadius: '8px', padding: '6px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}
        >
          ← Back
        </button>
      </nav>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            New Project
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            Add a new build to SiteSync
          </p>
        </div>

        <div style={{ background: '#1C1F26', border: '1px solid #2D3139', borderRadius: '16px', padding: '28px' }}>
          <form onSubmit={handleSubmit}>
            {[
              { label: 'Project name', value: name, setter: setName, placeholder: '142 Oak Ridge Drive', required: true },
              { label: 'Client name', value: clientName, setter: setClientName, placeholder: 'Patterson Family', required: false },
              { label: 'Site address', value: address, setter: setAddress, placeholder: '142 Oak Ridge Drive, Medina OH 44256', required: true },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#9CA3AF', marginBottom: '6px' }}>
                  {field.label} {field.required && <span style={{ color: '#F97316' }}>*</span>}
                </label>
                <input
                  type="text"
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  required={field.required}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', boxSizing: 'border-box' as const,
                    background: '#0F1117', border: '1px solid #2D3139',
                    borderRadius: '10px', padding: '12px 14px',
                    color: '#FFFFFF', fontSize: '14px', outline: 'none'
                  }}
                  onFocus={e => e.target.style.borderColor = '#F97316'}
                  onBlur={e => e.target.style.borderColor = '#2D3139'}
                />
              </div>
            ))}

            {error && (
              <div style={{ background: '#2D1515', border: '1px solid #7F1D1D', borderRadius: '8px', padding: '10px 14px', color: '#FCA5A5', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', marginTop: '8px',
                background: loading ? '#7C3A1A' : 'linear-gradient(135deg, #F97316, #EA580C)',
                border: 'none', borderRadius: '10px', padding: '13px',
                color: '#FFFFFF', fontSize: '15px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
              }}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}