import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users as UsersIcon, Eye, Edit3,
  Home, BarChart2, Clock, Settings, ChevronRight,
  Bell, User, LogOut, Crown, Search, RefreshCw,
  Calendar, CheckCircle, AlertCircle, Shield,
  UserCheck, Activity
} from 'lucide-react'

import { supabase, dbHelpers } from '../../lib/supabase'
import { api } from '../../lib/api'
import { logActivity } from '../../lib/activity'
import { ROLE_LABELS, ROLE_COLORS } from '../../lib/roleConstants'
import AdminSidebar from '../../components/AdminSidebar'

import '../../styles/adminStyling/Dashboard.css'
import '../../styles/adminStyling/Users.css'

// ============================================================================
// API WRAPPERS FOR NEON DATABASE
// ============================================================================

interface NeonUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getAllUsersFromNeon = async (): Promise<NeonUser[]> => {
  try {
    const users = await api.get<NeonUser[]>('/users/')
    return users || []
  } catch (err) {
    console.error('Failed to fetch users from Neon:', err)
    return []
  }
}

export const updateUserRoleInNeon = async (userId: string, role: string): Promise<boolean> => {
  try {
    await api.put<NeonUser>(`/users/${userId}`, { role })
    return true
  } catch (err) {
    console.error('Failed to update role in Neon:', err)
    return false
  }
}

export const getMyRoleFromNeon = async (): Promise<string> => {
  try {
    const me = await api.get<NeonUser>('/users/me')
    return me?.role || 'viewer'
  } catch (err) {
    console.error('Failed to get role from Neon:', err)
    return 'viewer'
  }
}

// Defined UserRole interface locally
export interface UserRole {
  user_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string | null;
  last_login: string | null;
  is_online: boolean;
  last_seen: string | null;
}

// Defined helper functions locally
export const canManageUsers = (role: string | null) => {
  return role === 'super_admin' || role === 'admin' || role === 'manager';
};

export const getOnlineStatus = (isOnline: boolean, lastSeen: string | null) => {
  if (isOnline) return { status: 'Online', color: '#10b981' };
  return { status: 'Offline', color: '#6b7280' };
};

export type Role = 'super_admin' | 'admin' | 'manager' | 'editor' | 'viewer' | string;

// ============================================================================
// 2. LOCAL RBAC MOCKS & PLACEHOLDERS
// ============================================================================
const rbacService = {
  getUser: async (id: string) => null,
  assignUserRole: async (id: string, role: string) => console.log('Assigned:', role),
  getAuditLogs: async (filter: any) => []
};

const usePermission = (userId: string, perm: string) => {
  return { hasPermission: true }; // Temporarily true so you can see the tabs
};

const PlaceholderCard = ({ title, icon, desc }: { title: string, icon: string, desc: string }) => (
  <div style={{ padding: '40px', background: '#0d1526', border: '1px solid #1e2d45', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</div>
    <h3 style={{ color: '#f1f5f9', marginBottom: '8px', fontSize: '20px' }}>{title}</h3>
    <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: '1.6' }}>{desc}</p>
  </div>
);

const RoleManagementPanel = () => <PlaceholderCard title="Role Management" icon="🔐" desc="Create custom roles and assign granular permissions to your team members." />
const AuditLogViewer = () => <PlaceholderCard title="Audit Logs" icon="📋" desc="Track every permission change, login, and role assignment in real-time." />
const RBACStatsDashboard = () => <PlaceholderCard title="RBAC Statistics" icon="📊" desc="Overview of role distributions and access metrics across your organization." />
const UserRoleAssignment = () => <PlaceholderCard title="Role Assignment" icon="👤" desc="Quickly assign and revoke roles for individual users." />
const TemporaryAccessManager = () => <PlaceholderCard title="Temporary Access" icon="⏳" desc="Grant time-limited access to contractors or clients." />

// ============================================================================
// MAIN USERS COMPONENT
// ============================================================================

export default function Users() {
  const navigate = useNavigate()

  const [users, setUsers] = useState<UserRole[]>([])
  const [myRole, setMyRole] = useState<Role | null>(null)
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const [activeTab, setActiveTab] = useState<'users' | 'rbac' | 'audit' | 'temporary'>('users')

  const { hasPermission: canAccessRBAC } = usePermission(currentUser?.id || '', 'user_create')
  
  // For debugging - allow override role
  const [forceRole, setForceRole] = useState<string | null>(null);

  useEffect(() => {
    loadData()
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.user-menu-wrapper')) setShowUserMenu(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const loadData = async () => {
    setLoading(true)
    setDebugInfo('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/login')

      setCurrentUser({
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        email: user.email || ''
      })

      let role: string | null = null
      let allUsers: NeonUser[] = []

      try {
        const [r, u] = await Promise.all([getMyRoleFromNeon(), getAllUsersFromNeon()])
        role = r
        allUsers = u ?? []
      } catch (err) {
        console.warn('Failed to fetch from Neon, falling back to Supabase:', err)
        try {
          const [r, u] = await Promise.all([getMyRole(), getAllUsers()])
          role = r
          allUsers = u.map(u => ({
            id: u.user_id,
            email: u.email,
            full_name: u.name,
            role: u.role,
            tenant_id: '',
            is_active: true,
            created_at: u.created_at || '',
            updated_at: u.created_at || '',
          }))
        } catch (fallbackErr) {
          console.error('All fallbacks failed:', fallbackErr)
        }
      }

      setMyRole((forceRole || role) as Role)
      setUsers(allUsers.map(u => ({
        user_id: u.id,
        email: u.email,
        name: u.full_name || u.email.split('@')[0],
        role: u.role,
        created_at: u.created_at,
        last_login: u.updated_at,
        is_online: false,
        last_seen: u.updated_at,
      })))
      
      // Debug info
      setDebugInfo(`Database Role: ${role || 'unknown'} | Force Role: ${forceRole || 'none'} | Users in DB: ${allUsers.length}`)

    } catch (err: any) {
      setDebugInfo(`Unexpected error: ${err?.message || err}`)
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: Role, email: string) => {
    if (userId === currentUser?.id && myRole === 'super_admin' && newRole !== 'super_admin') {
      showToast('Cannot downgrade your own Super Admin status', 'error')
      return
    }

    setUpdating(userId)
    try {
      let success = await updateUserRoleInNeon(userId, newRole)
      if (!success) {
        success = await updateUserRole(userId, newRole)
      }
      
      if (success) {
        rbacService.getAuditLogs({ targetUser: userId, limit: 1 })
        try {
          await logActivity('updated', 'Users', `Changed ${email} role to ${ROLE_LABELS[newRole]}`)
        } catch (e) { }
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
        showToast(`${email} is now ${ROLE_LABELS[newRole]}`, 'success')
      } else {
        showToast('Update failed. Check database permissions.', 'error')
      }
    } catch (err) {
      showToast('Error updating role', 'error')
    } finally {
      setUpdating(null)
    }
  }

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = async () => {
    try {
      if (currentUser?.id) await dbHelpers.updatePresence(currentUser.id, false)
    } catch (err) { }
    await supabase.auth.signOut()
    navigate('/login')
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  )

  const roleStats = {
    total: users.length,
    admins: users.filter(u => ['super_admin', 'admin'].includes(u.role)).length,
    employees: users.filter(u => u.role === 'employee').length,
    viewers: users.filter(u => ['viewer', 'editor', 'manager'].includes(u.role)).length,
  }

  const columns = [
    { label: 'User', icon: <User size={11} />, color: '#ec4899' },
    { label: 'Role', icon: <Shield size={11} />, color: '#a855f7' },
    { label: 'Joined', icon: <Calendar size={11} />, color: '#3b82f6' },
    { label: 'Last Login', icon: <Clock size={11} />, color: '#10b981' },
    { label: 'Status', icon: <Activity size={11} />, color: '#f59e0b' },
    ...(canManageUsers(myRole) ? [{ label: 'Actions', icon: <UserCheck size={11} />, color: '#8b5cf6' }] : [])
  ]

  if (loading) return <div className="dash-loading"><div className="dash-spinner" /></div>

  return (
    <div className="dash-wrapper">
      <div className="dash-bg">
        <div className="dash-blob dash-blob-1" /><div className="dash-blob dash-blob-2" /><div className="dash-blob dash-blob-3" />
        <div className="dash-grid" />
      </div>

      <AdminSidebar />

      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="dash-topbar-title">User Management 👥</h1>
            <p className="dash-topbar-sub">Manage roles and permissions</p>
          </div>
          <div className="dash-topbar-right">
            <button className="dash-icon-btn"><Bell size={18} /><span className="dash-notif-dot" /></button>
            <div className="user-menu-wrapper">
              <button className="dash-profile-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="dash-avatar">{currentUser?.name?.charAt(0).toUpperCase()}</div>
                <span className="dash-profile-name">{currentUser?.name}</span>
              </button>
              {showUserMenu && (
                <div className="dash-dropdown">
                  <a href="#" className="dash-drop-item" onClick={e => { e.preventDefault(); navigate('/settings') }}><Settings size={15} />Settings</a>
                  <hr className="dash-drop-hr" />
                  <button className="dash-drop-item dash-drop-logout" onClick={handleLogout}><LogOut size={15} />Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dash-content">

          {/* TAB NAVIGATION */}
          {(myRole === 'super_admin' || myRole === 'admin' || myRole === 'manager') && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #ffffff11', paddingBottom: '12px', flexWrap: 'wrap' }}>
              {[
                { id: 'users', label: '👥 Users List' },
                { id: 'rbac', label: '🔐 RBAC Management' },
                { id: 'temporary', label: '⏰ Temporary Access' },
                { id: 'audit', label: '📋 Audit Logs' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === tab.id ? '#8b5cf622' : 'transparent', color: activeTab === tab.id ? '#a855f7' : '#94a3b8', fontSize: '14px', fontWeight: activeTab === tab.id ? '600' : '500', transition: 'all 0.2s' }}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* TAB 1: USERS LIST */}
          {activeTab === 'users' && (
            <>
              <div className="users-stats-row">
                {[
                  { label: 'Total Users', value: roleStats.total, icon: <UsersIcon size={22} />, color: 'pink' },
                  { label: 'Admins', value: roleStats.admins, icon: <Crown size={22} />, color: 'yellow' },
                  { label: 'Employees', value: roleStats.employees, icon: <Edit3 size={22} />, color: 'purple' },
                  { label: 'Other Roles', value: roleStats.viewers, icon: <Eye size={22} />, color: 'blue' },
                ].map((s, i) => (
                  <div key={i} className={`users-stat-card users-stat-${s.color}`}>
                    <div className="users-stat-icon">{s.icon}</div>
                    <div><p className="users-stat-value">{s.value}</p><p className="users-stat-label">{s.label}</p></div>
                  </div>
                ))}
              </div>

              <div className="users-card">
                <div className="users-card-header">
                  <h2 className="users-card-title"><span className="users-card-title-dot" />All Users</h2>
                  <div className="users-header-right">
                    <div className="users-search-wrap">
                      <Search size={14} className="users-search-icon" />
                      <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="users-search" />
                    </div>
                    <button className="users-refresh-btn" onClick={loadData}><RefreshCw size={14} /></button>
                  </div>
                </div>

                <div className="users-table-wrap">
                  <table className="users-table">
                    <thead>
                      <tr className="users-thead-row">
                        {columns.map((col, i) => (
                          <th key={i}>
                            <div className="users-th-inner">
                              <span className="users-th-icon" style={{ color: col.color, background: `${col.color}18` }}>{col.icon}</span>
                              <span className="users-th-label">{col.label}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u) => {
                        const onlineStatus = getOnlineStatus(u.is_online, u.last_seen)
                        return (
                          <tr key={u.user_id}>
                            <td>
                              <div className="users-user-cell">
                                <div className="users-avatar-wrap">
                                  <div className="users-avatar" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[u.role] || '#8b5cf6'}, #4f46e5)` }}>
                                    {(u.name || u.email).charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div>
                                  <p className="users-email">{u.name || 'No Name'}</p>
                                  <p style={{ fontSize: '11px', opacity: 0.6 }}>{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="users-role-badge" style={{ background: `${ROLE_COLORS[u.role] || '#fff'}22`, color: ROLE_COLORS[u.role] || '#fff', border: `1px solid ${ROLE_COLORS[u.role] || '#fff'}44` }}>
                                {ROLE_LABELS[u.role] || u.role}
                              </span>
                            </td>
                            <td><div className="users-date"><Calendar size={12} />{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</div></td>
                            <td><div className="users-date"><Clock size={12} />{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</div></td>
                            <td>
                              <div className="users-status-cell">
                                <span className="users-status-dot" style={{ backgroundColor: onlineStatus.color }} />
                                <span className="users-status-text" style={{ color: onlineStatus.color }}>{onlineStatus.status}</span>
                              </div>
                            </td>
                            {canManageUsers(myRole) && (
                              <td>
                                {u.role !== 'super_admin' ? (
                                  <div className="users-role-actions">
                                    {(['admin', 'manager', 'editor', 'viewer', 'employee'] as Role[]).map(roleOption => (
                                      <button
                                        key={roleOption}
                                        className={`users-role-btn${u.role === roleOption ? ' current' : ''}`}
                                        onClick={() => handleRoleChange(u.user_id, roleOption, u.email)}
                                        disabled={updating === u.user_id || u.role === roleOption}
                                      >
                                        {updating === u.user_id ? '...' : ROLE_LABELS[roleOption]}
                                      </button>
                                    ))}
                                  </div>
                                ) : <span className="users-owner-locked">🔒 Protected</span>}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: RBAC MANAGEMENT */}
          {activeTab === 'rbac' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <RBACStatsDashboard />
              <RoleManagementPanel />
            </div>
          )}

          {/* TAB 3: TEMPORARY ACCESS */}
          {activeTab === 'temporary' && (
            <div style={{ display: 'grid', gap: '24px' }}>
              <TemporaryAccessManager />
              <UserRoleAssignment />
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'audit' && <AuditLogViewer />}

        </div>
      </main>

      {toast && (
        <div className={`users-toast users-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}


