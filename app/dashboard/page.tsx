'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('users').select('*').eq('id', user.id).single()
      setUser(userData)

      const { data: projectData } = await supabase
        .from('projects').select('*').order('created_at', { ascending: false })
      setProjects(projectData || [])
    }
    load()
  }, [])

  if (!user) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="bg-blue-950 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold text-lg tracking-wide">SiteSync</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">{user.name} — {user.role}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            className="text-gray-400 text-sm hover:text-white"
          >Sign out</button>
        </div>
      </nav>

      <div className="px-6 py-6">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Active builds</p>
            <p className="text-white text-2xl font-semibold">{projects.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Phases in progress</p>
            <p className="text-yellow-400 text-2xl font-semibold">0</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Completed today</p>
            <p className="text-green-400 text-2xl font-semibold">0</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Issues flagged</p>
            <p className="text-red-400 text-2xl font-semibold">0</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-medium">Active Projects</h2>
          <button
            onClick={() => router.push('/dashboard/new-project')}
            className="text-sm text-blue-400 border border-blue-400 rounded-lg px-4 py-2 hover:bg-blue-950"
          >+ New Project</button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
            <p className="text-gray-400 text-sm">No projects yet.</p>
            <p className="text-gray-600 text-xs mt-1">Create your first project to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <div key={project.id} onClick={() => router.push(`/dashboard/project/${project.id}`)} className="bg-gray-900 rounded-xl border border-gray-800 p-5 flex items-center justify-between hover:border-gray-600 cursor-pointer">
                <div>
                  <p className="text-white font-medium">{project.name}</p>
                  <p className="text-gray-400 text-sm mt-1">{project.address} — {project.client_name}</p>
                </div>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-800 text-gray-400 capitalize">
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}