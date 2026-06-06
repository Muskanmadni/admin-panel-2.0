import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  User, AlertCircle,
  Home, Settings, Briefcase, Clock, Calendar, Timer, Megaphone,
  Bell, LogOut, ChevronRight, Menu, X,
} from 'lucide-react'
import { supabase, dbHelpers } from '../../lib/supabase'
import { api } from '../../lib/api'
import { useSettings } from '../../lib/SettingsContext'
import '../../styles/employeeStyling/EmployeeDashboard.css'
import {
  OverviewPage,
  ProfilePage,
  ProjectsPage,
  AttendancePage,
  LeavePage,
  EmployeeSettingsPage,
  AnnouncementsPage,
  NotificationsPage,
} from '.'
import type { EmployeeNotification } from './NotificationsPage'
import TimeTracking from './TimeTracking'

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

interface AssignmentTask {
  id: string
  title: string
  description: string | null
  is_completed: boolean
  sort_order: number
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
  tasks: AssignmentTask[]
  tasksLoading?: boolean
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

const VALID_SECTIONS = [
  'overview', 'notifications', 'profile', 'projects', 'attendance',
  'leave', 'time-tracking', 'announcements', 'settings',
] as const

type SectionId = (typeof VALID_SECTIONS)[number]

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { settings } = useSettings()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [notifications, setNotifications] = useState<EmployeeNotification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerElapsed, setTimerElapsed] = useState(0)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTimerElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const handleTimerUpdate = useCallback((state: { isRunning: boolean; elapsed: number }) => {
    setTimerRunning(state.isRunning)
    setTimerElapsed(state.elapsed)
  }, [])

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true)
      const data = await api.get<EmployeeNotification[]>('/notifications/my')
      setNotifications(data)
    } catch { /* ignore */ }
    finally {
      setNotificationsLoading(false)
    }
  }

  const markRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`, {})
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch { /* ignore */ }
  }

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all', {})
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch { /* ignore */ }
  }

  const navigateToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId)
    setShowProfileMenu(false)
    setSidebarOpen(false)
    if (sectionId === 'overview') {
      setSearchParams({}, { replace: true })
    } else {
      setSearchParams({ section: sectionId }, { replace: true })
    }
    if (sectionId === 'notifications') {
      fetchNotifications()
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openNotificationsPage = () => {
    navigateToSection('notifications')
  }

  const [projects, setProjects] = useState<Project[]>([])

  const fetchAssignmentTasks = async (assignmentId: string) => {
    try {
      const tasks = await api.get<AssignmentTask[]>(`/employee-projects/${assignmentId}/tasks`)
      setProjects(prev => prev.map(p =>
        p.assignmentId === assignmentId ? { ...p, tasks, tasksLoading: false } : p
      ))
      return tasks
    } catch {
      setProjects(prev => prev.map(p =>
        p.assignmentId === assignmentId ? { ...p, tasksLoading: false } : p
      ))
      return []
    }
  }
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
    const section = searchParams.get('section')
    if (section && VALID_SECTIONS.includes(section as SectionId)) {
      const id = section as SectionId
      setActiveSection(id)
      if (id === 'notifications') fetchNotifications()
    }
  }, [searchParams])

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

        // Fetch backend profile for department, joinDate, status
        let backendProfile: any = null
        try {
          backendProfile = await api.get<any>('/users/me')
        } catch { /* ignore */ }

        setUser({
          id: backendProfile?.id || profile?.user_id || authUser.id,
          name: profile?.name || backendProfile?.full_name || authUser.email || '',
          email: backendProfile?.email || profile?.email || authUser.email || '',
          role: backendProfile?.role || profile?.role || 'employee',
          department: backendProfile?.department || profile?.department || 'N/A',
          joinDate: backendProfile?.created_at || profile?.created_at || '',
          status: backendProfile ? (backendProfile.is_active ? 'Active' : 'Inactive') : (profile?.is_online ? 'Active' : 'Offline'),
        })

        // Fetch assigned projects from Neon DB
        try {
          const projectsData = await api.get<any[]>('/employee-projects/my')
          const mapped = projectsData
            .filter((p) => p.status !== 'rejected')
            .map((p) => ({
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
              team: [],
              tasks: [] as AssignmentTask[],
              tasksLoading: p.status === 'accepted',
            }))
          setProjects(mapped)
          mapped
            .filter((p) => p.assignmentStatus === 'accepted')
            .forEach((p) => { fetchAssignmentTasks(p.assignmentId) })
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
          const notifData = await api.get<EmployeeNotification[]>('/notifications/my')
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
      setProjects((prev) => prev.filter((p) => p.assignmentId !== assignmentId))
    } catch (err) {
      console.error('Failed to reject project:', err)
      alert('Failed to reject project')
    }
  }

  const handleAcceptProject = async (assignmentId: string) => {
    try {
      setProjects(prev => prev.map(p =>
        p.assignmentId === assignmentId ? { ...p, assignmentStatus: 'accepted', tasksLoading: true } : p
      ))
      await api.post(`/employee-projects/${assignmentId}/accept`, {})
      await fetchAssignmentTasks(assignmentId)
    } catch (err) {
      console.error('Failed to accept project:', err)
      setProjects(prev => prev.map(p =>
        p.assignmentId === assignmentId ? { ...p, assignmentStatus: 'assigned', tasksLoading: false } : p
      ))
      alert('Failed to accept project')
    }
  }

  const handleToggleTask = async (assignmentId: string, taskId: string) => {
    try {
      const updated = await api.patch<AssignmentTask>(
        `/employee-projects/${assignmentId}/tasks/${taskId}/toggle`
      )
      setProjects(prev => prev.map(p =>
        p.assignmentId === assignmentId
          ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? updated : t) }
          : p
      ))
    } catch (err) {
      console.error('Failed to update task:', err)
      alert('Failed to update task')
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

  const handleCompleteProject = async (assignmentId: string) => {
    try {
      await api.post(`/employee-projects/${assignmentId}/complete`, {})
      setProjects(prev => prev.map(p =>
        p.assignmentId === assignmentId ? { ...p, status: 'completed', progress: 100 } : p
      ))
    } catch (err) {
      console.error('Failed to mark project complete:', err)
      alert('Failed to mark project as complete')
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
    { id: 'overview',      icon: <Home size={20} />,     label: 'Overview' },
    { id: 'notifications', icon: <Bell size={20} />,     label: 'Notifications', badge: unreadCount },
    { id: 'profile',       icon: <User size={20} />,     label: 'Profile' },
    { id: 'projects',      icon: <Briefcase size={20} />, label: 'Projects' },
    { id: 'attendance',    icon: <Clock size={20} />,    label: 'Attendance' },
    { id: 'leave',         icon: <Calendar size={20} />, label: 'Leave' },
    { id: 'time-tracking', icon: <Timer size={20} />,    label: 'Time Tracking' },
    { id: 'announcements', icon: <Megaphone size={20} />, label: 'Announcements' },
    { id: 'settings',      icon: <Settings size={20} />, label: 'Settings' },
  ]

  const sectionTitles: Record<string, { title: string; subtitle: string }> = {
    overview: { title: `Welcome back, ${user?.name?.split(' ')[0] || 'there'}! 👋`, subtitle: "Here's what's happening with your work today" },
    notifications: { title: 'Notifications', subtitle: 'Project assignments, leave updates, and alerts' },
    profile: { title: 'My Profile', subtitle: 'Your account details' },
    projects: { title: 'My Projects', subtitle: 'Assigned work and progress' },
    attendance: { title: 'Attendance', subtitle: 'Check in and view your records' },
    leave: { title: 'Leave', subtitle: 'Apply for leave and track requests' },
    'time-tracking': { title: 'Time Tracking', subtitle: 'Log your work hours' },
    announcements: { title: 'Announcements', subtitle: 'Company news and updates' },
    settings: { title: 'Settings', subtitle: 'Preferences and account options' },
  }
  const header = sectionTitles[activeSection] || sectionTitles.overview

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

      {/* Mobile sidebar backdrop */}
      <div
        className={`emp-sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar */}
      <aside className={`emp-sidebar${sidebarOpen ? ' open' : ''}`}>
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
              onClick={() => navigateToSection(item.id as SectionId)}
              className={`emp-nav-item ${activeSection === item.id ? 'active' : ''}`}
            >
              {item.icon}
              <span className="emp-nav-label">{item.label}</span>
              {'badge' in item && item.badge > 0 ? (
                <span className="emp-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              ) : null}
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
            <button
              type="button"
              className="emp-menu-toggle"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div>
              <h1 className="emp-header-title">{header.title}</h1>
              <p className="emp-header-subtitle">{header.subtitle}</p>
            </div>
          </div>
          <div className="emp-header-right">
            {timerRunning && activeSection !== 'time-tracking' && (
              <button
                type="button"
                className="emp-active-timer-pill"
                onClick={() => navigateToSection('time-tracking')}
                title="Return to time tracker"
              >
                <Timer size={16} />
                <span className="emp-active-timer-dot" />
                {formatTimerElapsed(timerElapsed)}
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`emp-notification-btn${activeSection === 'notifications' ? ' active' : ''}`}
                onClick={openNotificationsPage}
                title="View notifications"
                aria-label="Open notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4, background: '#ef4444',
                    color: '#fff', borderRadius: '50%', width: 18, height: 18,
                    fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{unreadCount}</span>
                )}
              </button>
            </div>
            <div className="emp-profile-menu">
              <button className="emp-profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                <div className="emp-avatar-small">{user?.name?.charAt(0).toUpperCase()}</div>
              </button>
              {showProfileMenu && (
                <div className="emp-dropdown">
                  <button onClick={() => navigateToSection('profile')}><User size={16} /> Profile</button>
                  <button onClick={() => navigateToSection('settings')}><Settings size={16} /> Settings</button>
                  <hr />
                  <button onClick={handleLogout}><LogOut size={16} /> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="emp-content">
          {/* Keep mounted so timer keeps running when navigating away */}
          <div
            className="emp-time-tracking-slot"
            style={{ display: activeSection === 'time-tracking' ? 'block' : 'none' }}
            aria-hidden={activeSection !== 'time-tracking'}
          >
            <TimeTracking
              onTimerUpdate={handleTimerUpdate}
              inactivitySessionEnabled={activeSection === 'time-tracking' || timerRunning}
              assignmentsReady={!loading}
              assignments={projects.map((p) => ({
                assignmentId: p.assignmentId,
                assignmentStatus: p.assignmentStatus,
                name: p.name,
              }))}
            />
          </div>

          {activeSection === 'overview' && (
            <OverviewPage
              user={user}
              projects={projects}
              attendance={attendance}
              unreadNotifications={unreadCount}
              onOpenNotifications={openNotificationsPage}
            />
          )}
          {activeSection === 'profile' && <ProfilePage user={user} />}
          {activeSection === 'projects' && (
            <ProjectsPage
              projects={projects}
              onReject={handleRejectProject}
              onAccept={handleAcceptProject}
              onProgressReport={handleProgressReport}
              onComplete={handleCompleteProject}
              onToggleTask={handleToggleTask}
            />
          )}
          {activeSection === 'attendance' && <AttendancePage />}
          {activeSection === 'leave' && (
            <LeavePage leaveRequests={leaveRequests} onNewLeave={() => setShowLeaveModal(true)} />
          )}
          {activeSection === 'settings' && <EmployeeSettingsPage />}
          {activeSection === 'announcements' && <AnnouncementsPage />}
          {activeSection === 'notifications' && (
            <NotificationsPage
              notifications={notifications}
              loading={notificationsLoading}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              onRefresh={fetchNotifications}
            />
          )}
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
