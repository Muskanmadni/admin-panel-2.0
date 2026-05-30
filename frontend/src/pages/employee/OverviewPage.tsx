import React from 'react'
import { Briefcase, CheckCircle, Calendar, TrendingUp, Bell } from 'lucide-react'

interface OverviewPageProps {
  user: any
  projects: any[]
  attendance: any[]
  unreadNotifications?: number
  onOpenNotifications?: () => void
}

export default function OverviewPage({ user, projects, attendance, unreadNotifications = 0, onOpenNotifications }: OverviewPageProps) {
  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const now = new Date()
  const presentDays = attendance.filter(a => {
    const d = new Date(a.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && a.status === 'present'
  }).length

  return (
    <div className="emp-overview">
      <div className="emp-stats-grid">
        <div className="emp-stat-card emp-stat-primary">
          <div className="emp-stat-icon"><Briefcase size={24} /></div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{activeProjects}</div>
            <div className="emp-stat-label">Active Projects</div>
          </div>
          <div className="emp-stat-bg-icon"><Briefcase size={40} /></div>
        </div>
        <div className="emp-stat-card emp-stat-success">
          <div className="emp-stat-icon"><CheckCircle size={24} /></div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{completedProjects}</div>
            <div className="emp-stat-label">Completed</div>
          </div>
          <div className="emp-stat-bg-icon"><CheckCircle size={40} /></div>
        </div>
        <div className="emp-stat-card emp-stat-warning">
          <div className="emp-stat-icon"><Calendar size={24} /></div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{presentDays}</div>
            <div className="emp-stat-label">Days Present</div>
          </div>
          <div className="emp-stat-bg-icon"><Calendar size={40} /></div>
        </div>
        <div className="emp-stat-card emp-stat-info">
          <div className="emp-stat-icon"><TrendingUp size={24} /></div>
          <div className="emp-stat-info">
            <div className="emp-stat-value">{projects.length}</div>
            <div className="emp-stat-label">Total Projects</div>
          </div>
          <div className="emp-stat-bg-icon"><TrendingUp size={40} /></div>
        </div>
      </div>


      <div className="emp-recent-activity">
        <h2>My Projects</h2>
        {projects.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '1rem 0' }}>No projects assigned yet.</p>
        ) : (
          <div className="emp-activity-list">
            {projects.slice(0, 5).map((p: any) => (
              <div key={p.id} className="emp-activity-item">
                <div className="emp-activity-icon emp-icon-info"><Briefcase size={16} /></div>
                <div className="emp-activity-content">
                  <div className="emp-activity-title">{p.name}</div>
                  <div className="emp-activity-desc">{p.description || 'No description'}</div>
                  <div className="emp-activity-time">{p.deadline || ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
