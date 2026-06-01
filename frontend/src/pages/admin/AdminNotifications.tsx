import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Calendar, Briefcase, CheckCircle2, XCircle, FileText,
  CheckCheck, Inbox, ExternalLink,
} from 'lucide-react'
import { api } from '../../lib/api'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/adminStyling/Dashboard.css'
import '../../styles/adminStyling/AdminNotifications.css'

export interface AdminNotification {
  id: string
  message: string
  is_read: boolean
  notification_type: string
  created_at: string
}

type FilterType = 'all' | 'leave_request' | 'project'

const typeConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  leave_request: {
    icon: <Calendar size={18} />,
    label: 'Leave application',
    className: 'adm-type-leave',
  },
  leave: {
    icon: <Calendar size={18} />,
    label: 'Leave',
    className: 'adm-type-leave',
  },
  project_accept: {
    icon: <CheckCircle2 size={18} />,
    label: 'Project accepted',
    className: 'adm-type-accept',
  },
  project_reject: {
    icon: <XCircle size={18} />,
    label: 'Project rejected',
    className: 'adm-type-reject',
  },
  project_report: {
    icon: <FileText size={18} />,
    label: 'Progress report',
    className: 'adm-type-report',
  },
  project: {
    icon: <Briefcase size={18} />,
    label: 'Project',
    className: 'adm-type-project',
  },
  general: {
    icon: <Bell size={18} />,
    label: 'General',
    className: 'adm-type-general',
  },
}

function getTypeConfig(type: string) {
  return typeConfig[type] || typeConfig.general
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function getActionLink(type: string): { path: string; label: string } | null {
  if (type === 'leave_request' || type === 'leave') {
    return { path: '/admin/leaves', label: 'View leave requests' }
  }
  if (type === 'project_report') {
    return { path: '/admin/project-reports', label: 'View project reports' }
  }
  if (type.startsWith('project')) {
    return { path: '/admin/assignments', label: 'View assignments' }
  }
  return null
}

function matchesFilter(n: AdminNotification, filter: FilterType): boolean {
  if (filter === 'all') return true
  if (filter === 'leave_request') {
    return n.notification_type === 'leave_request' || n.notification_type === 'leave'
  }
  return (
    n.notification_type === 'project_accept' ||
    n.notification_type === 'project_reject' ||
    n.notification_type === 'project_report' ||
    n.notification_type === 'project'
  )
}

export default function AdminNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.get<AdminNotification[]>('/notifications/my')
      setNotifications(data)
    } catch (err) {
      console.error(err)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`, {})
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch (err) {
      console.error(err)
    }
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {})
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const filtered = notifications.filter((n) => matchesFilter(n, filter))
  const unread = notifications.filter((n) => !n.is_read).length
  const leaveCount = notifications.filter((n) => matchesFilter(n, 'leave_request')).length
  const projectCount = notifications.filter((n) => matchesFilter(n, 'project')).length

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main">
        <div className="dash-content adm-notifications-page">
          <div className="page-header">
            <h1>Notifications</h1>
            <p>Leave applications, project responses, and progress updates from employees</p>
          </div>

          <div className="adm-notif-toolbar">
            <span className="adm-notif-unread-badge">{unread} unread</span>
            <div className="adm-notif-filters">
              {([
                ['all', `All (${notifications.length})`],
                ['leave_request', `Leave (${leaveCount})`],
                ['project', `Projects (${projectCount})`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`adm-notif-filter-btn${filter === key ? ' active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="adm-notif-actions">
              {unread > 0 && (
                <button type="button" className="adm-notif-btn" onClick={markAllRead}>
                  <CheckCheck size={16} />
                  Mark all read
                </button>
              )}
              <button type="button" className="adm-notif-btn" onClick={fetchNotifications}>
                Refresh
              </button>
            </div>
          </div>

          {loading && (
            <div className="adm-notif-empty">
              <div className="dash-spinner" />
              <p>Loading notifications...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="adm-notif-empty">
              <Inbox size={48} />
              <h3>No notifications</h3>
              <p>You will be notified when employees apply for leave, respond to projects, or submit progress reports.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <ul className="adm-notif-list">
              {filtered.map((n) => {
                const cfg = getTypeConfig(n.notification_type)
                const action = getActionLink(n.notification_type)
                return (
                  <li
                    key={n.id}
                    className={`adm-notif-item ${n.is_read ? 'read' : 'unread'} ${cfg.className}`}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <div className={`adm-notif-icon ${cfg.className}`}>{cfg.icon}</div>
                    <div className="adm-notif-body">
                      <div className="adm-notif-meta">
                        <span className="adm-notif-type">{cfg.label}</span>
                        <span className="adm-notif-time">{formatTime(n.created_at)}</span>
                      </div>
                      <p className="adm-notif-message">{n.message}</p>
                      {action && (
                        <button
                          type="button"
                          className="adm-notif-link"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!n.is_read) markRead(n.id)
                            navigate(action.path)
                          }}
                        >
                          <ExternalLink size={14} />
                          {action.label}
                        </button>
                      )}
                    </div>
                    {!n.is_read && <span className="adm-notif-dot" />}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
