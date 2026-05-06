'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from('users').select('role').eq('id', data.user.id).single()

    if (userData?.role === 'sub') {
      router.push('/jobs')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F1117 0%, #1C1F26 50%, #0F1117 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span style={{ fontSize: '24px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
              SiteSync
            </span>
          </div>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            Built for home builders
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#1C1F26',
          border: '1px solid #2D3139',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '600', margin: '0 0 6px' }}>
            Sign in
          </h2>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 28px' }}>
            Welcome back to SiteSync
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0F1117', border: '1px solid #2D3139',
                  borderRadius: '10px', padding: '12px 14px',
                  color: '#FFFFFF', fontSize: '14px', outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = '#F97316'}
                onBlur={e => e.target.style.borderColor = '#2D3139'}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0F1117', border: '1px solid #2D3139',
                  borderRadius: '10px', padding: '12px 14px',
                  color: '#FFFFFF', fontSize: '14px', outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = '#F97316'}
                onBlur={e => e.target.style.borderColor = '#2D3139'}
              />
            </div>

            {error && (
              <div style={{
                background: '#2D1515', border: '1px solid #7F1D1D',
                borderRadius: '8px', padding: '10px 14px',
                color: '#FCA5A5', fontSize: '13px', marginBottom: '16px', marginTop: '12px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', marginTop: '20px',
                background: loading ? '#7C3A1A' : 'linear-gradient(135deg, #F97316, #EA580C)',
                border: 'none', borderRadius: '10px',
                padding: '13px', color: '#FFFFFF',
                fontSize: '15px', fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign in to SiteSync'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#374151', fontSize: '12px', marginTop: '24px' }}>
          SiteSync © 2026 — Built for Legacy Homes
        </p>
      </div>
    </div>
  )
}