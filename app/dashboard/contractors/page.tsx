'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const TRADES = [
  'Foundation', 'Framing', 'Roofing', 'Plumbing', 'Electrical',
  'HVAC', 'Insulation', 'Drywall', 'Flooring', 'Painting',
  'Concrete', 'Masonry', 'Landscaping', 'Cabinetry', 'Trim & Finish',
  'Siding', 'Windows & Doors', 'Tile', 'General Labor', 'Other'
]

export default function ContractorsPage() {
  const [user, setUser] = useState<any>(null)
  const [subs, setSubs] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', trade: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [editingTrade, setEditingTrade] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
    if (userData?.role === 'sub') { router.push('/jobs'); return }
    setUser(userData)
    const { data } = await supabase.from('users').select('*').eq('role', 'sub').order('name')
    setSubs(data || [])
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) return
    setLoading(true)
    setError('')
    setSuccess('')

    const tempPassword = Math.random().toString(36).slice(2) + 'Ss1!'
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: tempPassword,
      options: { emailRedirectTo: `${window.location.origin}/login` }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (signUpData.user) {
      const { error: insertError } = await supabase.from('users').insert({
        id: signUpData.user.id,
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        trade: form.trade || null,
        role: 'sub'
      })
      if (insertError) { setError(insertError.message); setLoading(false); return }
    }

    fetch('/api/invite-contractor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, trade: form.trade, tempPassword })
    }).catch(() => {})

    setSuccess(`${form.name} added and invited.`)
    setForm({ name: '', email: '', phone: '', trade: '' })
    setShowForm(false)
    setLoading(false)
    await load()
  }

  async function updateTrade(subId: string, trade: string) {
    await supabase.from('users').update({ trade }).eq('id', subId)
    setEditingTrade(null)
    await load()
  }

  async function deleteSub(subId: string, name: string) {
    if (!confirm(`Remove ${name} from contractors? This won't delete their account.`)) return
    setDeletingId(subId)
    await supabase.from('users').update({ role: 'inactive' }).eq('id', subId)
    setDeletingId(null)
    await load()
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4B5563' }}>Loading...</p>
    </div>
  )

  const filtered = subs.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.trade?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0C10', fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>

      <nav style={{ background: '#111318', borderBottom: '1px solid #1E2128', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #F97316, #EA580C)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF' }}>SiteSync</span>
          </div>
          <span style={{ color: '#2D3139' }}>›</span>
          <span style={{ fontSize: '14px', color: '#9CA3AF', fontWeight: '500' }}>Contractors</span>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #1E2128', borderRadius: '8px', padding: '5px 12px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>← Dashboard</button>
      </nav>

      <div style={{ padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#F9FAFB', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Contractors</h1>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{subs.length} subcontractor{subs.length !== 1 ? 's' : ''} in system</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
            style={{ background: showForm ? '#1E2128' : 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '9px', padding: '9px 18px', color: '#FFF', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ Add Contractor'}
          </button>
        </div>

        {success && (
          <div style={{ background: '#0A1F0A', border: '1px solid #166534', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#4ADE80', margin: 0 }}>✓ {success}</p>
          </div>
        )}

        {showForm && (
          <div style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '14px', padding: '20px 24px', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#F9FAFB', margin: '0 0 16px' }}>New Contractor</p>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                {[
                  { label: 'Full name *', key: 'name', placeholder: 'Mike Torres', type: 'text' },
                  { label: 'Email *', key: 'email', placeholder: 'mike@torresco.com', type: 'email' },
                  { label: 'Phone', key: 'phone', placeholder: '(330) 555-0192', type: 'tel' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{field.label}</label>
                    <input type={field.type} value={(form as any)[field.key]}
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder} required={field.label.includes('*')}
                      style={{ width: '100%', boxSizing: 'border-box' as const, background: '#0A0C10', border: '1px solid #1E2128', borderRadius: '9px', padding: '10px 14px', color: '#F9FAFB', fontSize: '13px', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = '#F97316'}
                      onBlur={e => e.target.style.borderColor = '#1E2128'}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Trade</label>
                  <select value={form.trade} onChange={e => setForm(prev => ({ ...prev, trade: e.target.value }))}
                    style={{ width: '100%', boxSizing: 'border-box' as const, background: '#0A0C10', border: '1px solid #1E2128', borderRadius: '9px', padding: '10px 14px', color: form.trade ? '#F9FAFB' : '#4B5563', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                    <option value="">— Select trade —</option>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {error && <div style={{ background: '#1F0A0A', border: '1px solid #7F1D1D', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}><p style={{ fontSize: '13px', color: '#FCA5A5', margin: 0 }}>{error}</p></div>}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: '1px solid #1E2128', borderRadius: '9px', padding: '9px 18px', color: '#6B7280', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ background: loading ? '#7C3A1A' : 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '9px', padding: '9px 20px', color: '#FFF', fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? 'Adding...' : 'Add Contractor'}
                </button>
              </div>
            </form>
          </div>
        )}

        {subs.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, trade, or email..."
              style={{ width: '100%', boxSizing: 'border-box' as const, background: '#111318', border: '1px solid #1E2128', borderRadius: '10px', padding: '11px 16px', color: '#F9FAFB', fontSize: '13px', outline: 'none' }}
              onFocus={e => e.target.style.borderColor = '#F97316'}
              onBlur={e => e.target.style.borderColor = '#1E2128'}
            />
          </div>
        )}

        {subs.length === 0 ? (
          <div style={{ background: '#111318', border: '1px dashed #1E2128', borderRadius: '12px', padding: '60px', textAlign: 'center' as const }}>
            <p style={{ color: '#4B5563', fontSize: '14px', margin: '0 0 6px' }}>No contractors yet</p>
            <p style={{ color: '#374151', fontSize: '12px', margin: 0 }}>Add your first subcontractor to start assigning them to phases</p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#4B5563', fontSize: '13px', textAlign: 'center' as const, padding: '40px 0' }}>No contractors match "{search}"</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
            {filtered.map(sub => (
              <div key={sub.id} style={{ background: '#111318', border: '1px solid #1E2128', borderRadius: '12px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', background: '#1E2128', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#F97316' }}>{sub.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#F9FAFB', margin: '0 0 2px' }}>{sub.name}</p>
                      <p style={{ fontSize: '12px', color: '#6B7280', margin: 0, fontFamily: "'DM Mono', monospace" }}>{sub.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {editingTrade === sub.id ? (
                      <select defaultValue={sub.trade || ''}
                        onChange={e => updateTrade(sub.id, e.target.value)}
                        style={{ background: '#0A0C10', border: '1px solid #F97316', borderRadius: '8px', padding: '5px 10px', color: '#F9FAFB', fontSize: '12px', cursor: 'pointer' }}>
                        <option value="">— Select trade —</option>
                        {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span onClick={() => setEditingTrade(sub.id)}
                        style={{ background: sub.trade ? '#1A1F2E' : '#1E2128', border: `1px solid ${sub.trade ? '#1D4ED8' : '#374151'}`, borderRadius: '99px', padding: '4px 12px', fontSize: '11px', fontWeight: '600', color: sub.trade ? '#60A5FA' : '#4B5563', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                        {sub.trade || '+ Add trade'}
                      </span>
                    )}
                    <button onClick={() => deleteSub(sub.id, sub.name)} disabled={deletingId === sub.id}
                      style={{ background: 'none', border: '1px solid #2D1515', borderRadius: '8px', padding: '4px 10px', color: '#EF4444', fontSize: '12px', cursor: 'pointer' }}>
                      {deletingId === sub.id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}