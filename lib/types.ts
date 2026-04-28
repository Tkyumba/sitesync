export type Role = 'owner' | 'vp' | 'manager' | 'sub'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  trade?: string
  phone?: string
}

export type Project = {
  id: string
  name: string
  client_name: string
  address: string
  owner_id: string
  status: 'inactive' | 'active' | 'complete'
  created_at: string
  activated_at?: string
}

export type Phase = {
  id: string
  project_id: string
  name: string
  order_index: number
  status: 'not_started' | 'in_progress' | 'complete' | 'skipped'
  sub_id?: string
  started_at?: string
  completed_at?: string
}