import { supabase } from './supabase'

export interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  action: string
  section: string
  details?: string
  created_at: string
}

// Log an activity
export async function logActivity(
  action: string,
  section: string,
  details?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('activity_logs').insert({
    user_id: user.id,
    user_email: user.email,
    action,
    section,
    details: details || null,
  })
}

// Get recent activity logs
export async function getActivityLogs(limit = 20): Promise<ActivityLog[]> {
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

// Get activity for a specific section
export async function getSectionActivity(section: string): Promise<ActivityLog[]> {
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('section', section)
    .order('created_at', { ascending: false })
    .limit(5)

  return data || []
}

// Format time ago
export function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60)   return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export const ACTION_ICONS: Record<string, string> = {
  'created':  '✨',
  'updated':  '✏️',
  'deleted':  '🗑️',
  'viewed':   '👁️',
  'login':    '🔐',
  'logout':   '👋',
  'settings': '⚙️',
}