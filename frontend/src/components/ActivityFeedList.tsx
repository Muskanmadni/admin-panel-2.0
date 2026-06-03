import React from 'react'
import { Activity } from 'lucide-react'
import { ActivityLog, timeAgo, ACTION_ICONS } from '../lib/activity'

interface ActivityFeedListProps {
  logs: ActivityLog[]
  emptyMessage?: string
}

export default function ActivityFeedList({ logs, emptyMessage = 'No activity yet.' }: ActivityFeedListProps) {
  if (logs.length === 0) {
    return (
      <div className="dash-activity-empty">
        <Activity size={32} />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="activity-feed">
      {logs.map((log, i) => (
        <div key={log.id} className="activity-item" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="activity-icon">{ACTION_ICONS[log.action] || '📋'}</div>
          <div className="activity-body">
            <div className="activity-top">
              <span className="activity-email">{log.user_email}</span>
              <span className="activity-section-tag">{log.section}</span>
            </div>
            <p className="activity-action">
              <strong>{log.action}</strong>
              {log.details && ` — ${log.details}`}
            </p>
          </div>
          <span className="activity-time">{timeAgo(log.created_at)}</span>
        </div>
      ))}
    </div>
  )
}
