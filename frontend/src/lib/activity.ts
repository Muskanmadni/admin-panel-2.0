import { api } from './api'

export interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  action: string
  section: string
  details?: string
  created_at: string
}

export async function logActivity(
  action: string,
  section: string,
  details?: string
): Promise<void> {
  try {
    await api.post('/dashboard/activity', { action, section, details: details || null })
  } catch {
    // non-blocking
  }
}

export async function getActivityLogs(
  limit = 20,
  includeSupplemental = true
): Promise<ActivityLog[]> {
  try {
    const supplemental = includeSupplemental ? 'true' : 'false'
    return await api.get<ActivityLog[]>(
      `/dashboard/activity?limit=${limit}&include_supplemental=${supplemental}`
    )
  } catch {
    return []
  }
}

export async function clearActivityLogs(): Promise<{ deleted: number }> {
  const res = await api.delete<{ deleted: number; message: string }>('/dashboard/activity')
  return { deleted: res?.deleted ?? 0 }
}

export async function getSectionActivity(section: string): Promise<ActivityLog[]> {
  const logs = await getActivityLogs(50)
  return logs.filter(l => l.section === section).slice(0, 5)
}

export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export const ACTION_ICONS: Record<string, string> = {
  created: '✨',
  updated: '✏️',
  deleted: '🗑️',
  viewed: '👁️',
  login: '🔐',
  logout: '👋',
  settings: '⚙️',
  published: '📢',
  pending: '⏳',
  approved: '✅',
  rejected: '❌',
  assigned: '📋',
  logged: '⏱️',
}
