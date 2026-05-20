import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Briefcase, Clock, Calendar, CheckCircle, AlertCircle,
  TrendingUp, Award, Home, Settings,
  Bell, LogOut, Plus, ChevronRight,
  Users, XCircle
} from 'lucide-react'
import { supabase, dbHelpers } from '../lib/supabase'
import { api } from '../lib/api'
import { useSettings } from '../lib/SettingsContext'
import '../styles/EmployeeDashboard.css'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  department: string
  avatar?: string
  joinDate: string
  status: string
}

interface Project {
  id: string
  assignmentId: string
  assignmentStatus: string
  progressReport: string | null
  name: string
  description: string
  status: 'active' | 'completed' | 'pending'
  progress: number
  deadline: string
  priority: 'low' | 'medium' | 'high'
  team: string[]
}

interface AttendanceRecord {
  date: string
  checkIn: string
  checkOut: string
  status: 'present' | 'absent' | 'late' | 'half-day'
  hours: number
}

interface LeaveRequest {
  id: string
  type: 'sick' | 'vacation' | 'personal' | 'emergency'
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  days: number
}

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState<{ id: string; message: string; is_read: boolean; created_at: string }[]>([])

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = async () => {
    try {
      const data = await api.get<any[]>('/leave/notifications/my')
      setNotifications(data)
    } catch { /* ignore */ }
  }

  const markRead = async (id: string) => {
    try {
      await api.post(`/leave/notifications/${id}/read`, {})
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch { /* ignore */ }
  }

  const [projects, setProjects] = useState<Project[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])

  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [newLeave, setNewLeave] = useState({
    type: 'vacation' as LeaveRequest['type'],
    startDate: '',
    endDate: '',
    reason: ''
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          navigate('/login')
          return
        }

        // Fetch profile from Supabase
        const { data: profile } = await dbHelpers.getMyProfile(authUser.id)
        if (profile) {
          setUser({
            id: profile.user_id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            department: profile.department || 'General',
            joinDate: profile.created_at,
            status: profile.is_online ? 'Active' : 'Offline'
          })
        }

        // Fetch assigned projects from Neon DB
        try {
          const projectsData = await api.get<any[]>('/employee-projects/my')
          setProjects(projectsData.map(p => ({
            id: p.project_id,
            assignmentId: p.id,
            assignmentStatus: p.status,
            progressReport: p.progress_report ?? null,
            name: p.project_name,
            description: p.project_description || '',
            status: p.project_status || 'active',
            progress: p.project_progress ?? 0,
            deadline: p.project_end_date || '',
            priority: p.project_priority || 'medium',
            team: []
          })))
        } catch {
          // no projects yet
        }

        // Fetch leave requests
        try {
          const leavesData = await api.get<any[]>('/leave/my')
          setLeaveRequests(leavesData.map(l => ({
            id: l.id,
            type: l.type,
            startDate: l.start_date,
            endDate: l.end_date,
            reason: l.reason,
            status: l.status,
            days: l.days,
          })))
        } catch {
          // no leaves yet
        }

        // Fetch attendance
        try {
          const attData = await api.get<any[]>('/attendance/my')
          setAttendance(attData.map(r => ({
            date: r.date,
            checkIn: r.check_in || '',
            checkOut: r.check_out || '',
            status: r.status,
            hours: r.hours,
          })))
        } catch {
          // no attendance yet
        }

        // Fetch notifications
        try {
          const notifData = await api.get<any[]>('/leave/notifications/my')
          setNotifications(notifData)
        } catch { /* ignore */ }
      } catch (error) {
        console.error('Error fetching user data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [navigate])

  const handleCheckIn = async () => {
    try {
      const d = new Date()
      const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const record = await api.post<any>('/attendance/check-in', { date: localDate })
      setAttendance(prev => [
        { date: record.date, checkIn: record.check_in, checkOut: record.check_out || '', status: record.status, hours: record.hours },
        ...prev.filter(r => r.date !== record.date)
      ])
    } catch (err: any) {
      alert(err.message || 'Check-in failed')
    }
  }

  const handleCheckOut = async () => {
    try {
      const d = new Date()
      const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      const record = await api.post<any>('/attendance/check-out', { date: localDate })
      setAttendance(prev => prev.map(r =>
        r.date === record.date
          ? { ...r, checkOut: record.check_out, hours: record.hours }
          : r
      ))
    } catch (err: any) {
      alert(err.message || 'Check-out failed')
    }
  }

  const handleLeaveRequest = async () => {
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) return
    const days = Math.ceil((new Date(newLeave.endDate).getTime() - new Date(newLeave.startDate).getTime()) / 86400000) + 1
    try {
      const created = await api.post<any>('/leave/', {
        type: newLeave.type,
        start_date: newLeave.startDate,
        end_date: newLeave.endDate,
        reason: newLeave.reason,
        days,
      })
      setLeaveRequests(prev => [{
        id: created.id,
        type: created.type,
        startDate: created.start_date,
        endDate: created.end_date,
        reason: created.reason,
        status: created.status,
        days: created.days,
      }, ...prev])
    } catch (err) {
      console.error('Failed to submit leave request:', err)
      alert('Failed to submit leave request')
    }
    setNewLeave({ type: 'vacation', startDate: '', endDate: '', reason: '' })
    setShowLeaveModal(false)
  }

  const handleRejectProject = async (assignmentId: string) => {
    if (!confirm('Reject this project assignment?')) return
    try {
      await api.post(`/employee-projects/${assignmentId}/reject`, {})
      setProjects(prev => prev.map(p => p.assignmentId === assignmentId ? { ...p, assignmentStatus: 'rejected' } : p))
    } catch (err) {
      console.error('Failed to reject project:', err)
      alert('Failed to reject project')
    }
  }

  const handleAcceptProject = async (assignmentId: string) => {
    try {
      await api.post(`/employee-projects/${assignmentId}/accept`, {})
      setProjects(prev => prev.map(p => p.assignmentId === assignmentId ? { ...p, assignmentStatus: 'accepted' } : p))
    } catch (err) {
      console.error('Failed to accept project:', err)
      alert('Failed to accept project')
    }
  }

  const handleProgressReport = async (assignmentId: string, report: string) => {
    try {
      await api.post(`/employee-projects/${assignmentId}/progress-report`, { report })
      setProjects(prev => prev.map(p => p.assignmentId === assignmentId ? { ...p, progressReport: report } : p))
    } catch (err) {
      console.error('Failed to save progress report:', err)
      alert('Failed to save progress report')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="employee-dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    )
  }

  const navItems = [
    { id: 'overview',    icon: <Home size={20} />,     label: 'Overview' },
    { id: 'profile',     icon: <User size={20} />,     label: 'Profile' },
    { id: 'projects',    icon: <Briefcase size={20} />, label: 'Projects' },
    { id: 'attendance',  icon: <Clock size={20} />,    label: 'Attendance' },
    { id: 'leave',       icon: <Calendar size={20} />, label: 'Leave' },
    { id: 'settings',    icon: <Settings size={20} />, label: 'Settings' },
  ]

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()
  const todayAttendance = attendance.find(r => r.date === today)
  const canCheckIn = !todayAttendance?.checkIn
  const canCheckOut = !!(todayAttendance?.checkIn && !todayAttendance?.checkOut)

  return (
    <div className="employee-dashboard">
      {/* Animated Background */}
      <div className="emp-bg-animation">
        <div className="emp-blob emp-blob-1"></div>
        <div className="emp-blob emp-blob-2"></div>
        <div className="emp-blob emp-blob-3"></div>
        <div className="emp-grid"></div>
        <div className="emp-particles"></div>
      </div>

      {/* Sidebar */}
      <aside className="emp-sidebar">
        <div className="emp-sidebar-header">
          <div className="emp-logo-section">
            <div className="emp-logo-wrapper">
              <img
                src={settings.logoUrl || '/logo.png'}
                alt={settings.orgName}
                className="emp-logo-image"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <span className="emp-org-name">{settings.orgName}</span>
          </div>
        </div>

        <nav className="emp-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`emp-nav-item ${activeSection === item.id ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
              {activeSection === item.id && <ChevronRight size={16} />}
            </button>
          ))}
        </nav>

        <div className="emp-sidebar-footer">
          <div className="emp-user-section">
            <div className="emp-user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
            <div className="emp-user-info">
              <div className="emp-user-name">{user?.name}</div>
              <div className="emp-user-role">{user?.role}</div>
              <div className="emp-user-dept">{user?.department}</div>
            </div>
          </div>
          <button className="emp-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="emp-main-content">
        <header className="emp-header">
          <div className="emp-header-left">
            <h1 className="emp-header-title">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="emp-header-subtitle">Here's what's happening with your work today</p>
          </div>
          <div className="emp-header-right">
            <div style={{ position: 'relative' }}>
              <button className="emp-notification-btn" onClick={() => { setShowNotifications(!showNotifications); fetchNotifications() }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, background: '#ef4444',
                    color: '#fff', borderRadius: '50%', width: 18, height: 18,
                    fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{unreadCount}</span>
                )}
              </button>
              {showNotifications && (
                <div style={{
                  position: 'absolute', right: 0, top: '110%', width: 320, background: '#1e293b',
                  border: '1px solid #334155', borderRadius: 12, zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  maxHeight: 360, overflowY: 'auto'
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #334155', fontWeight: 700, fontSize: '0.9rem' }}>
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>No notifications</div>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => markRead(n.id)} style={{
                      padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b',
                      background: n.is_read ? 'transparent' : '#0f172a',
                      cursor: 'pointer', fontSize: '0.82rem', color: n.is_read ? '#64748b' : '#e2e8f0',
                      display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
                    }}>
                      {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', marginTop: 5, flexShrink: 0 }} />}
                      <span style={{ flex: 1 }}>{n.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="emp-profile-menu">
              <button className="emp-profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="emp-avatar-small">{user?.name?.charAt(0).toUpperCase()}</div>
              </button>
              {showProfileMenu && (
                <div className="emp-dropdown">
                  <button onClick={() => setActiveSection('profile')}><User size={16} /> Profile</button>
                  <button onClick={() => setActiveSection('settings')}><Settings size={16} /> Settings</button>
                  <hr />
                  <button onClick={handleLogout}><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="emp-content">
          {activeSection === 'overview' && <OverviewSection user={user} projects={projects} attendance={attendance} />}
          {activeSection === 'profile' && <ProfileSection user={user} />}
          {activeSection === 'projects' && <ProjectsSection projects={projects} onReject={handleRejectProject} onAccept={handleAcceptProject} onProgressReport={handleProgressReport} />}
          {activeSection === 'attendance' && (
            <AttendanceSection
              attendance={attendance}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              canCheckIn={canCheckIn}
              canCheckOut={canCheckOut}
            />
          )}
          {activeSection === 'leave' && (
            <LeaveSection leaveRequests={leaveRequests} onNewLeave={() => setShowLeaveModal(true)} />
          )}
          {activeSection === 'settings' && <SettingsSection />}
        </div>
      </main>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="emp-modal-overlay">
          <div className="emp-modal">
            <div className="emp-modal-header">
              <h2>Apply for Leave</h2>
              <button onClick={() => setShowLeaveModal(false)}><AlertCircle size={20} /></button>
            </div>
            <div className="emp-modal-content">
              <div className="emp-form-group">
                <label>Leave Type</label>
                <select value={newLeave.type} onChange={(e) => setNewLeave(prev => ({ ...prev, type: e.target.value as LeaveRequest['type'] }))}>
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="emp-form-row">
                <div className="emp-form-group">
                  <label>Start Date</label>
                  <input type="date" value={newLeave.startDate} onChange={(e) => setNewLeave(prev => ({ ...prev, startDate: e.target.value }))} />
                </div>
                <div className="emp-form-group">
                  <label>End Date</label>
                  <input type="date" value={newLeave.endDate} onChange={(e) => setNewLeave(prev => ({ ...prev, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="emp-form-group">
                <label>Reason</label>
                <textarea value={newLeave.reason} onChange={(e) => setNewLeave(prev => ({ ...prev, reason: e.target.value }))} placeholder="Enter reason for leave..." rows={4} />
              </div>
            </div>
            <div className="emp-modal-footer">
              <button className="emp-btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
              <button className="emp-btn-primary" onClick={handleLeaveRequest}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OverviewSection({ user, projects, attendance }: any) {
  const activeProjects = projects.filter((p: any) => p.status === 'active').length
  const completedProjects = projects.filter((p: any) => p.status === 'completed').length
  const now = new Date()
  const presentDays = attendance.filter((a: any) => {
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

function ProfileSection({ user }: any) {
  return (
    <div className="emp-profile">
      <div className="emp-profile-card">
        <div className="emp-profile-header">
          <div className="emp-profile-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="emp-profile-info">
            <h2>{user?.name}</h2>
            <p>{user?.role}</p>
            <div className="emp-profile-badge">Active</div>
          </div>
        </div>
        <div className="emp-profile-details">
          <div className="emp-detail-row">
            <span className="emp-detail-label">Email</span>
            <span className="emp-detail-value">{user?.email}</span>
          </div>
          <div className="emp-detail-row">
            <span className="emp-detail-label">Department</span>
            <span className="emp-detail-value">{user?.department}</span>
          </div>
          <div className="emp-detail-row">
            <span className="emp-detail-label">Join Date</span>
            <span className="emp-detail-value">{user?.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="emp-detail-row">
            <span className="emp-detail-label">Status</span>
            <span className="emp-detail-value">{user?.status}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectsSection({ projects, onReject, onAccept, onProgressReport }: any) {
  const [filter, setFilter] = useState('all')
  const [reportDraft, setReportDraft] = useState<Record<string, string>>({})
  const [expandedReport, setExpandedReport] = useState<string | null>(null)
  const filtered = projects.filter((p: any) => filter === 'all' || p.status === filter)

  return (
    <div className="emp-projects">
      <div className="emp-section-header">
        <h2>My Projects</h2>
        <div className="emp-project-filters">
          {['all', 'active', 'completed'].map(f => (
            <button key={f} className={`emp-filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '1rem 0' }}>No projects found.</p>
      ) : (
        <div className="emp-projects-grid">
          {filtered.map((project: any) => (
            <div key={project.id} className={`emp-project-card emp-project-${project.status}`}>
              <div className="emp-project-header">
                <h3>{project.name}</h3>
                <span className={`emp-project-status emp-status-${project.status}`}>{project.status}</span>
              </div>
              <p className="emp-project-desc">{project.description}</p>
              <div className="emp-project-progress">
                <div className="emp-progress-bar">
                  <div className="emp-progress-fill" style={{ width: `${project.progress}%` }}></div>
                </div>
                <span className="emp-progress-text">{project.progress}%</span>
              </div>
              <div className="emp-project-meta">
                <div className="emp-project-deadline">
                  <Calendar size={14} />
                  <span>{project.deadline}</span>
                </div>
                <div className={`emp-project-priority emp-priority-${project.priority}`}>{project.priority}</div>
              </div>
              {project.team.length > 0 && (
                <div className="emp-project-team">
                  <Users size={14} />
                  <span>{project.team.join(', ')}</span>
                </div>
              )}

              {/* Accept / Reject / Status buttons */}
              {project.assignmentStatus === 'rejected' ? (
                <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                  ✗ Assignment Rejected
                </div>
              ) : project.assignmentStatus === 'accepted' ? (
                <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#34d399', fontSize: '0.8rem', fontWeight: 600 }}>
                  ✓ Assignment Accepted
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onAccept(project.assignmentId)}
                    style={{
                      flex: 1, padding: '0.4rem 0',
                      background: '#10b98122', color: '#34d399', border: '1px solid #10b98144',
                      borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <CheckCircle size={14} /> Accept
                  </button>
                  <button
                    onClick={() => onReject(project.assignmentId)}
                    style={{
                      flex: 1, padding: '0.4rem 0',
                      background: '#ef444422', color: '#f87171', border: '1px solid #ef444444',
                      borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {/* Progress Report */}
              {project.assignmentStatus !== 'rejected' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    onClick={() => setExpandedReport(expandedReport === project.assignmentId ? null : project.assignmentId)}
                    style={{
                      width: '100%', padding: '0.4rem 0',
                      background: '#3b82f622', color: '#93c5fd', border: '1px solid #3b82f644',
                      borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <TrendingUp size={14} />
                    {project.progressReport ? 'Update Progress Report' : 'Write Progress Report'}
                  </button>
                  {expandedReport === project.assignmentId && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {project.progressReport && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', padding: '0.5rem', background: '#0f172a', borderRadius: 4 }}>
                          <strong style={{ color: '#64748b' }}>Last report:</strong> {project.progressReport}
                        </div>
                      )}
                      <textarea
                        rows={3}
                        placeholder="Describe your progress, what you've completed, and what's remaining..."
                        value={reportDraft[project.assignmentId] ?? project.progressReport ?? ''}
                        onChange={e => setReportDraft(prev => ({ ...prev, [project.assignmentId]: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.5rem', background: '#1e293b',
                          border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0',
                          fontSize: '0.8rem', resize: 'vertical', boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() => {
                          const text = reportDraft[project.assignmentId] ?? ''
                          if (!text.trim()) return
                          onProgressReport(project.assignmentId, text)
                          setExpandedReport(null)
                        }}
                        style={{
                          marginTop: '0.4rem', width: '100%', padding: '0.4rem 0',
                          background: '#3b82f6', color: '#fff', border: 'none',
                          borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        Submit Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AttendanceSection({ attendance, onCheckIn, onCheckOut, canCheckIn, canCheckOut }: any) {
  return (
    <div className="emp-attendance">
      <div className="emp-attendance-header">
        <h2>Attendance Tracking</h2>
        <div className="emp-attendance-actions">
          {canCheckIn && (
            <button className="emp-btn-primary emp-btn-checkin" onClick={onCheckIn}>
              <Clock size={16} /> Check In
            </button>
          )}
          {canCheckOut && (
            <button className="emp-btn-secondary emp-btn-checkout" onClick={onCheckOut}>
              <Clock size={16} /> Check Out
            </button>
          )}
        </div>
      </div>
      <div className="emp-attendance-stats">
        <div className="emp-attendance-stat">
          <div className="emp-stat-number">{attendance.filter((a: any) => a.status === 'present').length}</div>
          <div className="emp-stat-text">Days Present</div>
        </div>
        <div className="emp-attendance-stat">
          <div className="emp-stat-number">{attendance.filter((a: any) => a.status === 'late').length}</div>
          <div className="emp-stat-text">Late Arrivals</div>
        </div>
        <div className="emp-attendance-stat">
          <div className="emp-stat-number">{attendance.reduce((acc: number, a: any) => acc + a.hours, 0).toFixed(1)}</div>
          <div className="emp-stat-text">Total Hours</div>
        </div>
      </div>
      <div className="emp-attendance-table">
        <h3>Recent Attendance</h3>
        {attendance.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '1rem 0' }}>No attendance records yet. Use Check In to start.</p>
        ) : (
          <div className="emp-table-wrapper">
            <table>
              <thead>
                <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Hours</th></tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map((record: any, i: number) => (
                  <tr key={i}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.checkIn || '-'}</td>
                    <td>{record.checkOut || '-'}</td>
                    <td><span className={`emp-status-badge emp-status-${record.status}`}>{record.status}</span></td>
                    <td>{record.hours || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function LeaveSection({ leaveRequests, onNewLeave }: any) {
  return (
    <div className="emp-leave">
      <div className="emp-leave-header">
        <h2>Leave Management</h2>
        <button className="emp-btn-primary" onClick={onNewLeave}><Plus size={16} /> Apply for Leave</button>
      </div>
      <div className="emp-leave-stats">
        <div className="emp-leave-stat">
          <div className="emp-stat-number">{leaveRequests.filter((r: any) => r.status === 'approved').length}</div>
          <div className="emp-stat-text">Approved</div>
        </div>
        <div className="emp-leave-stat">
          <div className="emp-stat-number">{leaveRequests.filter((r: any) => r.status === 'pending').length}</div>
          <div className="emp-stat-text">Pending</div>
        </div>
        <div className="emp-leave-stat">
          <div className="emp-stat-number">{leaveRequests.reduce((acc: number, r: any) => acc + r.days, 0)}</div>
          <div className="emp-stat-text">Total Days</div>
        </div>
      </div>
      {leaveRequests.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '1rem 0' }}>No leave requests yet.</p>
      ) : (
        <div className="emp-leave-list">
          {leaveRequests.map((request: any) => (
            <div key={request.id} className="emp-leave-card">
              <div className="emp-leave-header">
                <div className="emp-leave-type">
                  <Calendar size={16} />
                  <span className={`emp-type-badge emp-type-${request.type}`}>
                    {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                  </span>
                </div>
                <span className={`emp-leave-status emp-status-${request.status}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              <div className="emp-leave-dates">
                <span>{new Date(request.startDate).toLocaleDateString()}</span>
                <span> - </span>
                <span>{new Date(request.endDate).toLocaleDateString()}</span>
                <span className="emp-days-count">({request.days} days)</span>
              </div>
              <p className="emp-leave-reason">{request.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsSection() {
  return (
    <div className="emp-settings">
      <h2>Settings</h2>
      <div className="emp-settings-card">
        <h3>Notification Preferences</h3>
        <div className="emp-setting-item">
          <label><input type="checkbox" defaultChecked /> Email notifications for project updates</label>
        </div>
        <div className="emp-setting-item">
          <label><input type="checkbox" defaultChecked /> Daily attendance reminders</label>
        </div>
        <div className="emp-setting-item">
          <label><input type="checkbox" /> Weekly performance reports</label>
        </div>
      </div>
      <div className="emp-settings-card">
        <h3>Account Settings</h3>
        <div className="emp-setting-item">
          <label>Change Password</label>
          <button className="emp-btn-secondary">Update Password</button>
        </div>
        <div className="emp-setting-item">
          <label>Two-Factor Authentication</label>
          <button className="emp-btn-secondary">Enable 2FA</button>
        </div>
      </div>
    </div>
  )
}
