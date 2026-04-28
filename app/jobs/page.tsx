'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function JobsPage() {
  const [user, setUser] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<{[key: string]: File | null}>({})
  const [preview, setPreview] = useState<{[key: string]: string}>({})
  const [note, setNote] = useState<{[key: string]: string}>({})
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: userData } = await supabase
      .from('users').select('*').eq('id', user.id).single()
    setUser(userData)

    const { data: phaseData } = await supabase
      .from('phases')
      .select('*, projects(name, address)')
      .eq('sub_id', user.id)
      .order('order_index', { ascending: true })
    setPhases(phaseData || [])
  }

  async function markStarted(phaseId: string) {
    await supabase.from('phases').update({
      status: 'in_progress',
      started_at: new Date().toISOString()
    }).eq('id', phaseId)
    await load()
  }

  function handlePhotoSelect(phaseId: string, file: File) {
    setSelectedPhoto(prev => ({ ...prev, [phaseId]: file }))
    const url = URL.createObjectURL(file)
    setPreview(prev => ({ ...prev, [phaseId]: url }))
  }

  async function markComplete(phaseId: string) {
    const photo = selectedPhoto[phaseId]
    if (!photo) {
      alert('Please upload a photo before marking complete.')
      return
    }

    setUploading(phaseId)

    const fileExt = photo.name.split('.').pop()
    const fileName = `${phaseId}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('phase-photos')
      .upload(fileName, photo)

    if (uploadError) {
      alert('Photo upload failed. Please try again.')
      setUploading(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('phase-photos')
      .getPublicUrl(fileName)

    await supabase.from('phase_photos').insert({
      phase_id: phaseId,
      uploaded_by: user.id,
      storage_url: publicUrl,
      note: note[phaseId] || ''
    })

    await supabase.from('phases').update({
      status: 'complete',
      completed_at: new Date().toISOString()
    }).eq('id', phaseId)

    setUploading(null)
    await load()
  }

  const statusColors: any = {
    not_started: 'bg-gray-800 text-gray-400',
    in_progress: 'bg-blue-950 text-blue-400',
    complete: 'bg-green-950 text-green-400',
  }

  if (!user) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-blue-950 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold text-lg">SiteSync</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">{user.name}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-gray-400 text-sm hover:text-white"
          >Sign out</button>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-8">
        <p className="text-gray-400 text-sm mb-6">Your assigned jobs</p>

        {phases.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
            <p className="text-gray-400 text-sm">No jobs assigned yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {phases.map((phase) => (
              <div key={phase.id} className={`rounded-xl border p-5 ${
                phase.status === 'in_progress'
                  ? 'border-blue-700 bg-blue-950/30'
                  : phase.status === 'complete'
                  ? 'border-green-800 bg-green-950/20'
                  : 'border-gray-800 bg-gray-900'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-white font-medium">{phase.projects?.name}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{phase.projects?.address}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full capitalize ${statusColors[phase.status]}`}>
                    {phase.status.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-blue-400 text-sm font-medium mb-4">{phase.name}</p>

                {phase.status === 'not_started' && (
                  <button
                    onClick={() => markStarted(phase.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-medium"
                  >
                    Mark as Started
                  </button>
                )}

                {phase.status === 'in_progress' && (
                  <div className="space-y-3">
                    {preview[phase.id] ? (
                      <div className="relative">
                        <img
                          src={preview[phase.id]}
                          className="w-full h-40 object-cover rounded-lg border border-gray-700"
                          alt="Preview"
                        />
                        <button
                          onClick={() => {
                            setPreview(prev => ({ ...prev, [phase.id]: '' }))
                            setSelectedPhoto(prev => ({ ...prev, [phase.id]: null }))
                          }}
                          className="absolute top-2 right-2 bg-gray-900 text-gray-400 text-xs px-2 py-1 rounded-lg"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 bg-gray-900">
                        <p className="text-gray-400 text-sm">Tap to upload photo</p>
                        <p className="text-gray-600 text-xs mt-1">Required before completing</p>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handlePhotoSelect(phase.id, file)
                          }}
                        />
                      </label>
                    )}

                    <textarea
                      value={note[phase.id] || ''}
                      onChange={e => setNote(prev => ({ ...prev, [phase.id]: e.target.value }))}
                      placeholder="Add a note (optional)"
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
                      rows={2}
                    />

                    <button
                      onClick={() => markComplete(phase.id)}
                      disabled={uploading === phase.id || !selectedPhoto[phase.id]}
                      className="w-full bg-green-700 hover:bg-green-600 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {uploading === phase.id ? 'Uploading...' : 'Submit — Mark as Complete'}
                    </button>
                  </div>
                )}

                {phase.status === 'complete' && (
                  <p className="text-center text-green-400 text-sm">
                    Done — completed {new Date(phase.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}