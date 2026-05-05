import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Grid, CheckCircle, Clock, Calendar, Search, Filter, Plus, Briefcase, User, 
  Eye, Edit, MoreVertical, Flag, Building2, DollarSign, Tag, UserPlus
} from 'lucide-react'
import BackButton from '../components/BackButton'
import { useSettings } from '../lib/SettingsContext'
import { api } from '../lib/api'
import { supabase } from '../lib/supabase'
import "../styles/workflows.css"
import '../styles/workflowsidebar.css'

// Types
interface Project {
  id: string
  name: string
  description: string
  status: 'completed' | 'assigned' | 'upcoming' | 'pending'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: string
  team: string[]
  startDate: string
  endDate: string
  progress: number
  budget?: number
  tags: string[]
  client?: string
  category: string
}

export default function Workflows() {
  const { settings } = useSettings()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'upcoming' | 'assigned'>('all')
  const [activeStatCard, setActiveStatCard] = useState<'all' | 'completed' | 'pending' | 'upcoming'>('all')
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', status: 'pending', priority: 'medium', assignee: '', client: '', category: '', start_date: '', end_date: '', budget: '', tags: '', progress: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [assignModal, setAssignModal] = useState<{ projectId: string; projectName: string } | null>(null)
  const [employees, setEmployees] = useState<{ id: string; full_name: string; email: string; role?: string; department?: string }[]>([])
  const [assigningTo, setAssigningTo] = useState('')
  const [assignMsg, setAssignMsg] = useState('')
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Error getting user:', error)
          return
        }
        
        if (authUser) {
          setUser({
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
            email: authUser.email || 'user@example.com'
          })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }

    getCurrentUser()
  }, [])

  useEffect(() => {
    const fetchProjects = async () => {
      const data = await api.get<any[]>('/workflows/')
      setProjects(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        status: p.status,
        priority: p.priority,
        assignee: p.assignee,
        team: p.team || [],
        startDate: p.start_date,
        endDate: p.end_date,
        progress: p.progress || 0,
        budget: p.budget,
        tags: p.tags || [],
        client: p.client,
        category: p.category || ''
      })))
    }
    fetchProjects()
  }, [])

  // Calculate stats
  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    pending: projects.filter(p => p.status === 'assigned' || p.status === 'pending').length,
    upcoming: projects.filter(p => p.status === 'upcoming').length
  }

  // Filter projects based on active stat card and filters
  const filteredProjects = projects.filter(project => {
    // Filter by stat card selection
    if (activeStatCard === 'completed' && project.status !== 'completed') return false
    if (activeStatCard === 'pending' && !['assigned', 'pending'].includes(project.status)) return false
    if (activeStatCard === 'upcoming' && project.status !== 'upcoming') return false

    // Filter by search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      if (!project.name.toLowerCase().includes(searchLower) &&
          !project.description.toLowerCase().includes(searchLower) &&
          !project.client?.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Filter by priority
    if (priorityFilter !== 'all' && project.priority !== priorityFilter) return false

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'in-progress' && !['assigned', 'pending'].includes(project.status)) return false
      if (statusFilter !== 'in-progress' && project.status !== statusFilter) return false
    }

    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981'
      case 'assigned': return '#3b82f6'
      case 'pending': return '#f59e0b'
      case 'upcoming': return '#e91e8c'
      default: return '#6b7280'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444'
      case 'high': return '#f59e0b'
      case 'medium': return '#fbbf24'
      case 'low': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        team: [],
      }
      const created = await api.post<any>('/workflows/', payload)
      setProjects(prev => [{
        id: created.id, name: created.name, description: created.description || '',
        status: created.status, priority: created.priority, assignee: created.assignee,
        team: created.team || [], startDate: created.start_date, endDate: created.end_date,
        progress: created.progress || 0, budget: created.budget, tags: created.tags || [],
        client: created.client, category: created.category || ''
      }, ...prev])
      setShowModal(false)
      setForm({ name: '', description: '', status: 'pending', priority: 'medium', assignee: '', client: '', category: '', start_date: '', end_date: '', budget: '', tags: '', progress: 0 })
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const openAssignModal = async (projectId: string, projectName: string) => {
    setAssignModal({ projectId, projectName })
    setAssigningTo('')
    setAssignMsg('')
    setLoadingEmployees(true)
    try {
      const data = await api.get<any[]>(`/employee-projects/filter-employees?project_id=${projectId}`)
      if (data && data.length > 0) {
        setEmployees(data)
      } else {
        const all = await api.get<any[]>('/users/')
        setEmployees(all.filter((u: any) => u.user_type === 'employee' || u.role === 'employee'))
      }
    } catch {
      try {
        const all = await api.get<any[]>('/users/')
        setEmployees(all.filter((u: any) => u.user_type === 'employee' || u.role === 'employee'))
      } catch { setEmployees([]) }
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleAssign = async () => {
    if (!assignModal || !assigningTo) return
    try {
      await api.post('/employee-projects/assign', { employee_id: assigningTo, project_id: assignModal.projectId })
      setAssignMsg('✅ Project assigned successfully!')
      setTimeout(() => setAssignModal(null), 1200)
    } catch (err: any) {
      setAssignMsg(err?.message || '❌ Failed to assign')
    }
  }

  return (
    <>
    <div className="clicktake-workflows">
      {/* 3D Particle Effects */}
      <div className="particle-container">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 15}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-wrapper">
              <img 
                src={settings.logoUrl || '/logo.png'} 
                alt={settings.orgName || 'CLICKTAKETECH'}
                className="logo-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div className="logo-fallback" style={{ display: 'none' }}>
                <span className="logo-text">{settings.orgName || 'CLICKTAKETECH'}</span>
              </div>
            </div>
            <span className="admin-label">{settings.orgTagline || 'Admin Panel'}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-link">
            <Grid size={20} />
            <span>Dashboard</span>
          </a>
          <a href="/users" className="nav-link">
            <User size={20} />
            <span>Users</span>
          </a>
          <a href="/workflows" className="nav-link active">
            <Briefcase size={20} />
            <span>Workflows</span>
          </a>
          <a href="/admin/assignments" className="nav-link">
            <UserPlus size={20} />
            <span>Assignments</span>
          </a>
          <a href="/rbac" className="nav-link">
            <Flag size={20} />
            <span>RBAC Access</span>
          </a>
          <a href="/settings" className="nav-link">
            <Search size={20} />
            <span>Settings</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-section">
            <div className="user-avatar">
              <User size={24} />
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Loading...'}</div>
              <div className="user-email">{user?.email || 'Loading...'}</div>
              <div className="user-badges">
                <span className="online-badge">ONLINE</span>
                <span className="role-badge">SUPER ADMIN</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Stats Cards */}
        <div className="stats-container">
          <div 
            className={`stat-card ${activeStatCard === 'all' ? 'active' : ''}`}
            onClick={() => setActiveStatCard('all')}
            style={{ '--accent-color': '#7c3aed' } as React.CSSProperties}
          >
            <div className="stat-icon">
              <Grid size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-count">{stats.total}</div>
              <div className="stat-label">All Projects</div>
            </div>
          </div>

          <div 
            className={`stat-card ${activeStatCard === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveStatCard('completed')}
            style={{ '--accent-color': '#10b981' } as React.CSSProperties}
          >
            <div className="stat-icon">
              <CheckCircle size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-count">{stats.completed}</div>
              <div className="stat-label">Finished</div>
            </div>
          </div>

          <div 
            className={`stat-card ${activeStatCard === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveStatCard('pending')}
            style={{ '--accent-color': '#f59e0b' } as React.CSSProperties}
          >
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-count">{stats.pending}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>

          <div 
            className={`stat-card ${activeStatCard === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveStatCard('upcoming')}
            style={{ '--accent-color': '#e91e8c' } as React.CSSProperties}
          >
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-count">{stats.upcoming}</div>
              <div className="stat-label">Scheduled</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-input">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="upcoming">Upcoming</option>
            <option value="assigned">Assigned</option>
          </select>

          <button className="add-project-btn" onClick={() => setShowModal(true)}>
            <Plus size={20} />
            Add Project
          </button>
        </div>

        {/* Projects Grid */}
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <div key={project.id} className="project-card">
              {/* Status and Priority Badges */}
              <div className="card-header">
                <div 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(project.status) }}
                >
                  {project.status === 'completed' && 'Completed'}
                  {project.status === 'assigned' && 'In Progress'}
                  {project.status === 'pending' && 'In Progress'}
                  {project.status === 'upcoming' && 'Upcoming'}
                </div>
                <div 
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(project.priority) }}
                >
                  {project.priority.toUpperCase()}
                </div>
              </div>

              {/* Project Title and Description */}
              <h3 className="project-title">{project.name}</h3>
              <p className="project-description">{project.description}</p>

              <div className="divider"></div>

              {/* Client Info */}
              {project.client && (
                <div className="client-info">
                  <Building2 size={16} />
                  <span>{project.client}</span>
                </div>
              )}

              {/* Assignee and Due Date */}
              <div className="meta-row">
                <div className="assignee-info">
                  <User size={16} />
                  <span>{project.assignee || 'Unassigned'}</span>
                </div>
                <div className="due-date">
                  <Calendar size={16} />
                  <span>{project.endDate}</span>
                </div>
              </div>

              {/* Budget Badge */}
              {project.budget && (
                <div className="budget-badge">
                  <DollarSign size={16} />
                  <span>${project.budget.toLocaleString()}</span>
                </div>
              )}

              {/* Tech Stack Tags */}
              <div className="tech-tags">
                {project.tags.map((tag, index) => (
                  <span key={index} className="tech-tag">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="progress-section">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <span className="progress-percentage">{project.progress}%</span>
              </div>

              {/* Action Icons */}
              <div className="action-icons">
                <button className="action-btn" title="Assign to Employee" onClick={() => openAssignModal(project.id, project.name)}>
                  <UserPlus size={18} />
                </button>
                <button className="action-btn">
                  <Eye size={18} />
                </button>
                <button className="action-btn">
                  <Edit size={18} />
                </button>
                <button className="action-btn">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    
    </div>

    {/* Add Project Modal */}
    {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Project</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddProject} className="modal-form">
              <div className="form-row">
                <label>Project Name *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Project name" />
              </div>
              <div className="form-row">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={3} />
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="pending">Pending</option>
                    <option value="assigned">In Progress</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Assignee</label>
                  <input value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} placeholder="Assignee name" />
                </div>
                <div className="form-row">
                  <label>Client</label>
                  <input value={form.client} onChange={e => setForm({...form, client: e.target.value})} placeholder="Client name" />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div className="form-row">
                  <label>End Date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-row">
                  <label>Budget ($)</label>
                  <input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} placeholder="0" />
                </div>
                <div className="form-row">
                  <label>Category</label>
                  <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Web Development" />
                </div>
              </div>
              <div className="form-row">
                <label>Tags (comma separated)</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="React, Node.js, API" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitting}>{submitting ? 'Adding...' : 'Add Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    {assignModal && (
      <div className="modal-overlay" onClick={() => setAssignModal(null)}>
        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
          <div className="modal-header">
            <h2>Assign "{assignModal.projectName}"</h2>
            <button className="modal-close" onClick={() => setAssignModal(null)}>×</button>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 12 }}>
              Employees are sorted by best role match for this project.
            </p>
            <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8' }}>Select Employee</label>
            <select
              value={assigningTo}
              onChange={e => setAssigningTo(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: 8, background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155', marginBottom: 16 }}
              disabled={loadingEmployees}
            >
              <option value="">{loadingEmployees ? 'Loading employees...' : employees.length === 0 ? 'No employees found' : '-- Choose employee --'}</option>
              {employees.map((emp, idx) => (
                <option key={emp.id} value={emp.id}>
                  {idx === 0 ? '⭐ ' : ''}{emp.full_name || emp.email}
                  {emp.role ? ` (${emp.role}${emp.department ? ' · ' + emp.department : ''})` : ''}
                </option>
              ))}
            </select>
            {assignMsg && <p style={{ color: assignMsg.startsWith('✅') ? '#34d399' : '#f87171', marginBottom: 12 }}>{assignMsg}</p>}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn-submit" onClick={handleAssign} disabled={!assigningTo}>Assign</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
