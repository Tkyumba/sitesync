'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function ProjectPage() {
  const [project, setProject] = useState<any>(null)
  const [phases, setPhases] = useState<any[]>([])
  const [subs, setSubs] = useState<any[]>([])
  const [photos, setPhotos] = useState<{ [key: string]: any[] }>({})
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null)
  const [newPhase, setNewPhase] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: projectData } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    setProject(projectData)

    const { data: phaseData } = await supabase
      .from('phases')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true })

    setPhases(phaseData || [])

    const { data: subData } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'sub')

    setSubs(subData || [])
  }

  async function loadPhotos(phaseId: string) {
    const { data } = await supabase
      .from('phase_photos')
      .select('*')
      .eq('phase_id', phaseId)
      .order('created_at', { ascending: false })

    setPhotos(prev => ({ ...prev, [phaseId]: data || [] }))
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId)
  }

  async function addPhase(e: React.FormEvent) {
    e.preventDefault()
    if (!newPhase.trim()) return

    setLoading(true)

    await supabase.from('phases').insert({
      project_id: projectId,
      name: newPhase,
      order_index: phases.length + 1,
      status: 'not_started'
    })

    setNewPhase('')
    await load()
    setLoading(false)
  }

  async function assignSub(phaseId: string, subId: string) {
    await supabase
      .from('phases')
      .update({ sub_id: subId || null })
      .eq('id', phaseId)

    await load()
  }

  async function activateProject() {
    await supabase
      .from('projects')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    const firstPhase = phases[0]

    if (firstPhase?.sub_id) {
      await supabase.from('notifications_log').insert({
        trigger: 'project_activated',
        recipient_id: firstPhase.sub_id,
        message: `You have been assigned to ${project.name} — ${firstPhase.name}.`,
        channel: 'email'
      })
    }

    await load()
  }

  const statusColors: any = {
    not_started: 'text-gray-400 bg-gray-800',
    in_progress: 'text-blue-400 bg-blue-950',
    complete: 'text-green-400 bg-green-950',
    skipped: 'text-gray-600 bg-gray-900'
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-blue-950 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold text-lg">SiteSync</span>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 text-sm hover:text-white"
        >
          Back to dashboard
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-semibold">
            {project.name}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {project.address} — {project.client_name}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-3 py-1 rounded-full bg-gray-800 text-gray-400 capitalize">
              {project.status}
            </span>

            {project.status === 'inactive' && (
              <button
                onClick={activateProject}
                className="text-xs px-4 py-1.5 rounded-full bg-green-700 hover:bg-green-600 text-white font-medium"
              >
                Activate Project
              </button>
            )}

            {project.status === 'active' && (
              <span className="text-xs px-3 py-1 rounded-full bg-green-900 text-green-400 font-medium">
                Live
              </span>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-white font-medium mb-4">Build Phases</h2>

          {phases.length === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 text-center mb-4">
              <p className="text-gray-400 text-sm">No phases yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-600 text-sm font-mono w-6">
                          {index + 1}
                        </span>
                        <span className="text-white text-sm">
                          {phase.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full capitalize ${statusColors[phase.status]}`}
                        >
                          {phase.status.replace('_', ' ')}
                        </span>

                        {phase.status === 'complete' && (
                          <button
                            onClick={() => loadPhotos(phase.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            {expandedPhase === phase.id
                              ? 'Hide photos'
                              : 'View photos'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="ml-9">
                      <select
                        value={phase.sub_id || ''}
                        onChange={e =>
                          assignSub(phase.id, e.target.value)
                        }
                        className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 w-full"
                      >
                        <option value="">
                          — Assign subcontractor —
                        </option>

                        {subs.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {expandedPhase === phase.id &&
                    photos[phase.id] && (
                      <div className="border-t border-gray-800 p-4 bg-gray-950">
                        {photos[phase.id].length === 0 ? (
                          <p className="text-gray-500 text-xs">
                            No photos uploaded yet.
                          </p>
                        ) : (
                          <div className="space-y-6">
                            <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                              {photos[phase.id].length} photo
                              {photos[phase.id].length > 1 ? 's' : ''}{' '}
                              uploaded
                            </p>

                            {photos[phase.id].map((photo, i) => (
                              <div key={photo.id} className="space-y-2">
                                <p className="text-gray-500 text-xs">
                                  Photo {i + 1} of{' '}
                                  {photos[phase.id].length}
                                </p>

                                {/* ✅ FIXED SECTION */}
                                <a
                                  href={photo.storage_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block"
                                >
                                  <img
                                    src={photo.storage_url}
                                    alt={`Phase completion photo ${i + 1}`}
                                    className="w-full rounded-xl border border-gray-700 object-cover hover:opacity-95 cursor-zoom-in transition-opacity"
                                    style={{ maxHeight: '400px' }}
                                  />
                                  <p className="text-blue-400 text-xs mt-1.5 hover:underline">
                                    Click to open full size — right click to download
                                  </p>
                                </a>

                                {photo.note && (
                                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 mt-2">
                                    <p className="text-gray-300 text-xs italic">
                                      "{photo.note}"
                                    </p>
                                  </div>
                                )}

                                <p className="text-gray-600 text-xs">
                                  Uploaded{' '}
                                  {new Date(
                                    photo.created_at
                                  ).toLocaleString()}
                                </p>

                                {i <
                                  photos[phase.id].length - 1 && (
                                  <div className="border-t border-gray-800 mt-4"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addPhase} className="flex gap-3">
            <input
              type="text"
              value={newPhase}
              onChange={e => setNewPhase(e.target.value)}
              placeholder="e.g. Foundation, Framing, Rough Plumbing..."
              className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}