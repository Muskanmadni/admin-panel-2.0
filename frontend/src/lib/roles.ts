import { api } from './api'

export type Role = 'admin' | 'manager' | 'employee' | 'client'

export interface UserRole {
  id: string
  user_id: string
  name: string
  email: string
  role: Role
  tenant_id: string
  created_at: string
}

export async function getMyRole(): Promise<Role | null> {
  try {
    const data = await api.get<{ role: Role }>('/users/me')
    return data.role
  } catch {
    return null
  }
}

export async function getAllUsers(): Promise<UserRole[]> {
  try {
    const data = await api.get<any[]>('/users/')
    return data.map((u: any) => ({
      id: u.id,
      user_id: u.id,
      name: u.full_name || '',
      email: u.email,
      role: u.role as Role,
      tenant_id: u.tenant_id,
      created_at: u.created_at
    }))
  } catch {
    return []
  }
}

export async function updateUserRole(userId: string, role: Role): Promise<boolean> {
  try {
    await api.put(`/users/${userId}`, { role })
    return true
  } catch {
    return false
  }
}

export const canEdit   = (role: Role | null) => role === 'admin' || role === 'manager'
export const canDelete = (role: Role | null) => role === 'admin'
export const canManageUsers = (role: Role | null) => role === 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  client: 'Client',
}

export const ROLE_COLORS: Record<Role, string> = {
  admin: '#ec4899',
  manager: '#a855f7',
  employee: '#10b981',
  client: '#6b7280',
}