import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, User, Settings, Bell, Home, Users,
  Zap, DollarSign, CheckCircle, Clock,
  AlertCircle, BarChart2, ChevronRight, Activity, Wifi, WifiOff, Shield, Key, ClipboardList, Megaphone
} from 'lucide-react'

// Internal imports
import { supabase, dbHelpers } from '../../lib/supabase'
import { getActivityLogs, ActivityLog, timeAgo, ACTION_ICONS } from '../../lib/activity'
import { api } from '../../lib/api'
import { ROLE_LABELS, ROLE_COLORS } from '../../lib/roleConstants'
import '../../styles/adminStyling/Dashboard.css'

// ==========================================================
// Fetch user role from Neon database
// ==========================================================
export const getMyRole = async (): Promise<UserRole> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      const response = await fetch('/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const user = await response.json();
        return user?.role || 'employee';
      }
    }
  } catch (err) {
    console.warn('Failed to get role from API:', err);
  }
  return 'employee';
};
// ============================================================================
// RBAC SYSTEM DATA & TYPES 
// ============================================================================
interface RBACRole {
  id: string;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
  parentRole?: string;
  permissions: string[];
  createdAt: string;
  memberCount: number;
}

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  timestamp: string;
}

interface TempAccess {
  id: string;
  user: string;
  role: string;
  expiresAt: string;
  grantedBy: string;
}

const PERMISSION_GROUPS = {
  Projects: [
    { key: "projects.view", label: "View Projects" },
    { key: "projects.create", label: "Create Projects" },
    { key: "projects.edit", label: "Edit Projects" },
    { key: "projects.delete", label: "Delete Projects" }
  ],
  Time: [
    { key: "time.view", label: "View Timesheets" },
    { key: "time.log", label: "Log Time" },
    { key: "time.approve", label: "Approve Timesheets" }
  ],
  HRM: [
    { key: "hrm.view", label: "View Employees" },
    { key: "hrm.manage", label: "Manage Employees" },
    { key: "hrm.payroll", label: "Access Payroll" }
  ],
  Settings: [
    { key: "settings.view", label: "View Settings" },
    { key: "settings.manage", label: "Manage Settings" },
    { key: "settings.security", label: "Security Settings" }
  ],
};

const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();

const INITIAL_ROLES: RBACRole[] = [
  { id: "super_admin", name: "Super Admin", description: "Full unrestricted access", color: "#ef4444", isSystem: true, permissions: ALL_PERMISSIONS.map(p => p.key), createdAt: "2024-01-01", memberCount: 1 },
  { id: "admin", name: "Admin", description: "Administrative access", color: "#f97316", isSystem: true, parentRole: "super_admin", permissions: ALL_PERMISSIONS.map(p => p.key).filter(k => k !== "settings.security"), createdAt: "2024-01-01", memberCount: 3 },
  { id: "manager", name: "Manager", description: "Team management", color: "#eab308", isSystem: true, parentRole: "admin", permissions: ["projects.view", "projects.create", "projects.edit", "hrm.view"], createdAt: "2024-01-01", memberCount: 7 }
];

const actionColor = (a: string) => ({ PERMISSION_GRANTED: "#22c55e", PERMISSION_REVOKED: "#ef4444", ROLE_CREATED: "#3b82f6", ROLE_EDITED: "#eab308", TEMP_ACCESS_EXPIRED: "#6b7280" }[a] ?? "#6b7280");

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

interface UserData { id: string; name: string; email: string; }

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  activeTasks: number;
  pendingActions: number;
  usersTrend: string;
  projectsTrend: string;
  activeTasksTrend: string;
  pendingActionsTrend: string;
}

export default function Dashboard() {
  const navigate = useNavigate()

  // App State
  const [activeView, setActiveView] = useState<'dashboard' | 'rbac'>('dashboard')
  const [user, setUser] = useState<UserData | null>(null)
  const [myRole, setMyRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isBrowserOnline, setIsBrowserOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsBrowserOnline(true)
    const goOffline = () => setIsBrowserOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return navigate('/login')

        setUser({ id: authUser.id, name: authUser.user_metadata?.name || 'User', email: authUser.email || '' })
        await dbHelpers.updatePresence(authUser.id, true)
        await dbHelpers.updateLastLogin(authUser.id)

        const [role, logs, dashboardStats] = await Promise.all([
          getMyRole(), 
          getActivityLogs(8),
          api.get<DashboardStats>('/dashboard/stats').catch(() => null)
        ])
        setMyRole(role)
        setActivityLogs(logs)
        setStats(dashboardStats)
      } catch (err) {
        console.error('Error initialising dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initDashboard()

    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.user-menu-wrapper')) setShowUserMenu(false)
    }
    const handleBeforeUnload = () => { if (user?.id) dbHelpers.updatePresence(user.id, false) }

    document.addEventListener('click', handleClick)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => { document.removeEventListener('click', handleClick); window.removeEventListener('beforeunload', handleBeforeUnload) }
  }, [navigate, user?.id])

  const handleLogout = async () => {
    try {
      if (user?.id) await dbHelpers.updatePresence(user.id, false)
      await supabase.auth.signOut()
      navigate('/login')
    } catch { navigate('/login') }
  }

  if (isLoading) return <div className="dash-loading"><div className="dash-spinner"></div></div>

  const navItems = [
    { id: 'dashboard', icon: <Home size={18} />, label: 'Dashboard' },
    { id: 'users', icon: <Users size={18} />, label: 'Users' },
    { id: 'workflows', icon: <BarChart2 size={18} />, label: 'Workflows' },
    { id: 'admin/rbac', icon: <Shield size={18} />, label: 'RBAC Access' },
    { id: 'admin/notifications', icon: <Bell size={18} />, label: 'Notifications' },
    { id: 'admin/leaves', icon: <ClipboardList size={18} />, label: 'Leave Requests' },
    { id: 'admin/attendance', icon: <Clock size={18} />, label: 'Attendance' },
    { id: 'admin/time-tracking', icon: <Clock size={18} />, label: 'Time Tracking' },
    { id: 'admin/announcements', icon: <Megaphone size={18} />, label: 'Announcements' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
  ]

  return (
    <div className="dash-wrapper">
      <div className="dash-bg">
        <div className="dash-blob dash-blob-1"></div><div className="dash-blob dash-blob-2"></div>
        <div className="dash-blob dash-blob-3"></div><div className="dash-grid"></div>
      </div>

      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <div className="dash-logo-img-wrap">
            <img src="/logo.png" alt="Logo" className="dash-logo-img" onError={e => { e.currentTarget.style.display = 'none' }} />
            <div className="dash-logo-glow"></div>
          </div>
          <div><span className="dash-logo-name">CliCLTake</span><span className="dash-logo-sub">Admin Panel</span></div>
        </div>

        <nav className="dash-nav">
          {navItems.map((item) => (
            <button key={item.id}
              onClick={() => {
                if (item.id === 'dashboard') setActiveView(item.id as any);
                else navigate(`/${item.id}`);
              }}
              className={`dash-nav-item${(activeView === item.id || (item.id === 'admin/rbac' && window.location.pathname === '/admin/rbac')) ? ' active' : ''}`}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {(activeView === item.id) && <ChevronRight size={14} className="dash-nav-arrow" />}
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="dash-user-mini">
            <div className="dash-avatar-sm" style={{ position: 'relative' }}>
              {user?.name?.charAt(0).toUpperCase()}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isBrowserOnline ? '#10b981' : '#6b7280', border: '2px solid var(--bg-card)' }} />
            </div>
            <div>
              <p className="dash-mini-name">{user?.name}</p>
              <p className="dash-mini-email">{user?.email}</p>
              <p style={{ fontSize: '11px', color: isBrowserOnline ? '#10b981' : '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isBrowserOnline ? <><Wifi size={10} /> ONLINE</> : <><WifiOff size={10} /> OFFLINE</>}
              </p>
            </div>
          </div>
          {myRole && (
            <div className="dash-role-badge" style={{ background: `${ROLE_COLORS[myRole] || '#fff'}22`, color: ROLE_COLORS[myRole] || '#fff', border: `1px solid ${ROLE_COLORS[myRole] || '#fff'}44` }}>
              {ROLE_LABELS[myRole] || 'User'}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="dash-topbar-title">
              {activeView === 'dashboard' ? `Welcome back, ${user?.name?.split(' ')[0]} 👋` : 'Role-Based Access Control (RBAC)'}
            </h1>
            <p className="dash-topbar-sub">
              {activeView === 'dashboard' ? "Here's what's happening today" : "Manage roles, permissions, and security policies"}
            </p>
          </div>
          <div className="dash-topbar-right">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase', background: isBrowserOnline ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', border: `1px solid ${isBrowserOnline ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}`, color: isBrowserOnline ? '#10b981' : '#9ca3af' }}>
              {isBrowserOnline ? <Wifi size={11} /> : <WifiOff size={11} />} {isBrowserOnline ? 'Online' : 'Offline'}
            </span>
            <button className="dash-icon-btn"><Bell size={18} /><span className="dash-notif-dot"></span></button>
            <div className="user-menu-wrapper">
              <button className="dash-profile-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="dash-avatar" style={{ position: 'relative' }}>{user?.name?.charAt(0).toUpperCase()}</div>
                <span className="dash-profile-name">{user?.name}</span>
              </button>
              {showUserMenu && (
                <div className="dash-dropdown">
                  <button className="dash-drop-item" onClick={() => navigate('/settings')}><Settings size={15} />Settings</button>
                  <hr className="dash-drop-hr" />
                  <button className="dash-drop-item dash-drop-logout" onClick={handleLogout}><LogOut size={15} />Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dash-content">
          {activeView === 'dashboard' ? <DashboardWidgets activityLogs={activityLogs} stats={stats} /> : <RBACManager />}
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// WIDGETS COMPONENT (Original Dashboard Content)
// ============================================================================
function DashboardWidgets({ activityLogs, stats }: { activityLogs: ActivityLog[], stats: DashboardStats | null }) {
  const displayStats = [
    { 
      label: 'Total Users', 
      value: stats?.totalUsers.toLocaleString() || '...', 
      icon: <Users size={24} />, 
      color: 'pink', 
      sub: stats?.usersTrend || 'Loading...' 
    },
    { 
      label: 'Total Projects', 
      value: stats?.totalProjects.toLocaleString() || '...', 
      icon: <BarChart2 size={24} />, 
      color: 'purple', 
      sub: stats?.projectsTrend || 'Loading...' 
    },
    { 
      label: 'Active Tasks', 
      value: stats?.activeTasks.toLocaleString() || '...', 
      icon: <Zap size={24} />, 
      color: 'blue', 
      sub: stats?.activeTasksTrend || 'Loading...' 
    },
    { 
      label: 'Pending Actions', 
      value: stats?.pendingActions.toLocaleString() || '...', 
      icon: <AlertCircle size={24} />, 
      color: 'rose', 
      sub: stats?.pendingActionsTrend || 'Loading...' 
    },
  ]

  return (
    <>
      <div className="dash-stats-grid">
        {displayStats.map((s, i) => (
          <div className={`dash-stat-card dash-stat-${s.color}`} key={i} style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="dash-stat-icon">{s.icon}</div>
            <div className="dash-stat-info">
              <p className="dash-stat-label">{s.label}</p>
              <p className="dash-stat-value">{s.value}</p>
              <p className="dash-stat-sub">{s.sub}</p>
            </div>
            <div className="dash-stat-bg-icon">{s.icon}</div>
          </div>
        ))}
      </div>
      <div className="dash-mid-row" style={{ marginTop: '24px' }}>
        <div className="dash-card">
          <div className="dash-card-header"><h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={16} style={{ color: '#ec4899' }} /> Live Activity Feed</h2></div>
          {activityLogs.length === 0 ? (
            <div className="dash-activity-empty"><Activity size={32} /><p>No activity yet.</p></div>
          ) : (
            <div className="activity-feed">
              {activityLogs.map((log, i) => (
                <div key={log.id} className="activity-item" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="activity-icon">{ACTION_ICONS[log.action] || '📋'}</div>
                  <div className="activity-body">
                    <div className="activity-top"><span className="activity-email">{log.user_email}</span><span className="activity-section-tag">{log.section}</span></div>
                    <p className="activity-action"><strong>{log.action}</strong>{log.details && ` — ${log.details}`}</p>
                  </div>
                  <span className="activity-time">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// RBAC UI COMPONENT (Embedded natively)
// ============================================================================
function RBACManager() {
  const [roles, setRoles] = useState<RBACRole[]>(INITIAL_ROLES)
  const [tempAccess, setTempAccess] = useState<TempAccess[]>([{ id: "t1", user: "contractor@acme.com", role: "viewer", expiresAt: "2025-05-01", grantedBy: "Admin" }])
  const [audit] = useState<AuditEntry[]>([{ id: "a1", actor: "System", action: "ROLE_CREATED", target: "Admin", detail: "Initialized", timestamp: "2024-01-01" }])

  const [rbacTab, setRbacTab] = useState('roles')
  const [selectedRole, setSelectedRole] = useState<RBACRole | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")

  const togglePerm = useCallback((role: RBACRole, perm: string) => {
    setRoles(prev => prev.map(r => r.id === role.id ? { ...r, permissions: r.permissions.includes(perm) ? r.permissions.filter(p => p !== perm) : [...r.permissions, perm] } : r));
    setSelectedRole(prev => prev ? { ...prev, permissions: prev.permissions.includes(perm) ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm] } : prev);
  }, []);

  const createRole = () => {
    if (!newRoleName.trim()) return;
    setRoles(p => [...p, { id: `c${Date.now()}`, name: newRoleName, description: "Custom role", color: "#3b82f6", isSystem: false, permissions: [], createdAt: new Date().toISOString().split("T")[0], memberCount: 0 }]);
    setShowRoleModal(false); setNewRoleName("");
  };

  return (
    <div style={{ color: '#e2e8f0', animation: 'fadeIn 0.3s ease' }}>
      {/* RBAC Top Navigation */}
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #1e2d45', paddingBottom: '12px', marginBottom: '24px' }}>
        {[
          { id: 'roles', icon: <Shield size={16} />, label: 'Roles & Permissions' },
          { id: 'matrix', icon: <Key size={16} />, label: 'Permissions Matrix' },
          { id: 'temp', icon: <Clock size={16} />, label: 'Temporary Access' },
          { id: 'audit', icon: <ClipboardList size={16} />, label: 'Audit Log' }
        ].map(tab => (
          <button key={tab.id} onClick={() => { setRbacTab(tab.id); setSelectedRole(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: rbacTab === tab.id ? '#3b82f6' : '#94a3b8', borderBottom: rbacTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent', paddingBottom: '12px', marginBottom: '-13px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ROLES TAB */}
      {rbacTab === 'roles' && !selectedRole && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>System Roles</h2>
            <button onClick={() => setShowRoleModal(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>+ Create Role</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {roles.map(role => (
              <div key={role.id} className="dash-card" style={{ padding: '20px', border: '1px solid #1e2d45', background: '#0d1526' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: role.color }} />
                  <span style={{ fontWeight: 700, fontSize: '16px', flex: 1 }}>{role.name}</span>
                  {role.isSystem && <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontWeight: 700 }}>SYSTEM</span>}
                </div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', minHeight: '38px' }}>{role.description}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setSelectedRole(role)} style={{ flex: 1, background: '#1e2d45', color: '#e2e8f0', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Edit Access</button>
                  {!role.isSystem && <button onClick={() => setRoles(r => r.filter(x => x.id !== role.id))} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PERMISSIONS EDITOR */}
      {rbacTab === 'roles' && selectedRole && (
        <div className="dash-card" style={{ padding: '24px' }}>
          <button onClick={() => setSelectedRole(null)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>← Back to Roles</button>
          <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: selectedRole.color }} />
            {selectedRole.name} Permissions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
              <div key={group} style={{ background: '#0a0f1e', border: '1px solid #1e2d45', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ background: '#111827', padding: '12px 16px', borderBottom: '1px solid #1e2d45', fontWeight: 700, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase' }}>{group}</div>
                <div style={{ padding: '12px 16px' }}>
                  {perms.map(perm => {
                    const isOn = selectedRole.permissions.includes(perm.key);
                    return (
                      <div key={perm.key} onClick={() => !selectedRole.isSystem && togglePerm(selectedRole, perm.key)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', cursor: selectedRole.isSystem ? 'not-allowed' : 'pointer', opacity: selectedRole.isSystem ? 0.6 : 1 }}>
                        <div style={{ width: '36px', height: '20px', borderRadius: '12px', background: isOn ? '#3b82f6' : '#1e2d45', position: 'relative', transition: 'all 0.2s' }}>
                          <div style={{ position: 'absolute', top: '3px', left: isOn ? '19px' : '3px', width: '14px', height: '14px', borderRadius: '50%', background: isOn ? '#fff' : '#94a3b8', transition: 'all 0.2s' }} />
                        </div>
                        <span style={{ fontSize: '14px', color: isOn ? '#f1f5f9' : '#64748b' }}>{perm.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MATRIX TAB */}
      {rbacTab === 'matrix' && (
        <div className="dash-card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#111827' }}>
                <th style={{ padding: '16px', borderBottom: '1px solid #1e2d45', color: '#94a3b8' }}>Permission</th>
                {roles.map(r => <th key={r.id} style={{ padding: '16px', borderBottom: '1px solid #1e2d45', color: r.color, textAlign: 'center' }}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map((perm, i) => (
                <tr key={perm.key} style={{ background: i % 2 === 0 ? '#0d1526' : '#0a0f1e' }}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1e2d45' }}>{perm.label} <code style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{perm.key}</code></td>
                  {roles.map(r => (
                    <td key={r.id} style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #1e2d45' }}>
                      {r.permissions.includes(perm.key) ? <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✓</span> : <span style={{ color: '#334155' }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: CREATE ROLE */}
      {showRoleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="dash-card" style={{ width: '400px', padding: '24px' }}>
            <h2 style={{ marginBottom: '16px' }}>Create Custom Role</h2>
            <input type="text" placeholder="Role Name (e.g., Editor)" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0f1e', border: '1px solid #1e2d45', borderRadius: '8px', color: '#fff', marginBottom: '20px', outline: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'transparent', border: '1px solid #1e2d45', color: '#94a3b8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createRole} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Create Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


