import React, { useState, useEffect } from 'react'
import { Megaphone, Calendar, User, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { api } from '../../lib/api'
import '../../styles/employeeStyling/AnnouncementsPage.css'

export interface Announcement {
  id: string
  title: string
  description: string
  content: string
  priority: 'low' | 'medium' | 'high'
  status: string
  image?: string | null
  expires_at?: string | null
  created_at: string
  created_by_name?: string | null
}

const priorityLabel: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const end = new Date(expiresAt)
  if (Number.isNaN(end.getTime())) return false
  return end < new Date()
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Announcement[]>('/announcements/')
      .then((data) => {
        const active = data.filter((a) => !isExpired(a.expires_at))
        setAnnouncements(active)
      })
      .catch((err) => {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Failed to load announcements')
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="emp-announcements">
      <div className="emp-announcements-header">
        <div>
          <h2>
            <Megaphone size={22} />
            Company Announcements
          </h2>
          <p>Updates and news from your organization</p>
        </div>
        <span className="emp-announcements-count">{announcements.length} active</span>
      </div>

      {loading && (
        <div className="emp-announcements-loading">
          <div className="loading-spinner" />
          <p>Loading announcements...</p>
        </div>
      )}

      {!loading && error && (
        <div className="emp-announcements-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && announcements.length === 0 && (
        <div className="emp-announcements-empty">
          <Megaphone size={48} />
          <h3>No announcements yet</h3>
          <p>Check back later for company updates.</p>
        </div>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="emp-announcements-list">
          {announcements.map((item) => {
            const expanded = expandedId === item.id
            return (
              <article key={item.id} className={`emp-announcement-card priority-${item.priority}`}>
                {item.image && (
                  <div className="emp-announcement-image-wrap">
                    <img src={item.image} alt={item.title} />
                  </div>
                )}
                <div className="emp-announcement-body">
                  <div className="emp-announcement-top">
                    <span className={`emp-priority-badge priority-${item.priority}`}>
                      {priorityLabel[item.priority] || item.priority}
                    </span>
                    <span className="emp-announcement-date">
                      <Calendar size={14} />
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="emp-announcement-desc">{item.description}</p>
                  {item.created_by_name && (
                    <p className="emp-announcement-author">
                      <User size={14} />
                      Posted by {item.created_by_name}
                    </p>
                  )}
                  {item.content && (
                    <>
                      <button
                        type="button"
                        className="emp-announcement-toggle"
                        onClick={() => toggleExpand(item.id)}
                      >
                        {expanded ? (
                          <>
                            <ChevronUp size={16} /> Hide details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} /> Read more
                          </>
                        )}
                      </button>
                      {expanded && (
                        <div className="emp-announcement-content">{item.content}</div>
                      )}
                    </>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
