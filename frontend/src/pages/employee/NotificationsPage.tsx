import React from 'react'
import { Bell, Briefcase, Calendar, CheckCircle2, Inbox } from 'lucide-react'
import '../../styles/employeeStyling/NotificationsPage.css'

export interface EmployeeNotification {
  id: string
  message: string
  is_read: boolean
  notification_type: string
  created_at: string
}

interface NotificationsPageProps {
  notifications: EmployeeNotification[]
  loading?: boolean
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onRefresh: () => void
}

const typeConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  project: {
    icon: <Briefcase size={18} />,
    label: 'Project',
    className: 'type-project',
  },
  leave: {
    icon: <Calendar size={18} />,
    label: 'Leave',
    className: 'type-leave',
  },
  general: {
    icon: <Bell size={18} />,
    label: 'General',
    className: 'type-general',
  },
}

function getTypeConfig(type: string) {
  return typeConfig[type] || typeConfig.general
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function NotificationsPage({
  notifications,
  loading = false,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
}: NotificationsPageProps) {
  const unread = notifications.filter((n) => !n.is_read)

  return (
    <div className="emp-notifications">
      <div className="emp-notifications-header">
        <div>
          <h2>
            <Bell size={22} />
            Notifications
          </h2>
          <p>Project assignments, leave updates, and more</p>
        </div>
        <div className="emp-notifications-actions">
          <span className="emp-notif-badge">
            {unread.length} unread
          </span>
          {unread.length > 0 && (
            <button type="button" className="emp-btn-secondary" onClick={onMarkAllRead}>
              <CheckCircle2 size={16} />
              Mark all read
            </button>
          )}
          <button type="button" className="emp-btn-secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="emp-notif-filters">
        <span className="emp-notif-filter active">All ({notifications.length})</span>
        <span className="emp-notif-filter">
          Projects ({notifications.filter((n) => n.notification_type === 'project').length})
        </span>
        <span className="emp-notif-filter">
          Leave ({notifications.filter((n) => n.notification_type === 'leave').length})
        </span>
      </div>

      {loading && (
        <div className="emp-notifications-loading">
          <div className="loading-spinner" />
          <p>Loading notifications...</p>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="emp-notifications-empty">
          <Inbox size={48} />
          <h3>No notifications yet</h3>
          <p>When an admin assigns you a project or updates your leave, you will see it here.</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <ul className="emp-notifications-list">
          {notifications.map((n) => {
            const cfg = getTypeConfig(n.notification_type)
            return (
              <li
                key={n.id}
                className={`emp-notification-item ${n.is_read ? 'read' : 'unread'} ${cfg.className}`}
                onClick={() => !n.is_read && onMarkRead(n.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !n.is_read) onMarkRead(n.id)
                }}
                role="button"
                tabIndex={0}
              >
                <div className={`emp-notif-icon ${cfg.className}`}>{cfg.icon}</div>
                <div className="emp-notif-body">
                  <div className="emp-notif-meta">
                    <span className="emp-notif-type">{cfg.label}</span>
                    <span className="emp-notif-time">{formatTime(n.created_at)}</span>
                  </div>
                  <p className="emp-notif-message">{n.message}</p>
                </div>
                {!n.is_read && <span className="emp-notif-dot" aria-label="Unread" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
