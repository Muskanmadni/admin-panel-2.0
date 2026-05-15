import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, BarChart2, Shield, ClipboardList, Clock, Settings, ChevronRight, Wifi, WifiOff, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getMyRole } from '../pages/Dashboard'
import { ROLE_LABELS, ROLE_COLORS } from '../lib/roleConstants'

const navItems = [
  { path: '/dashboard', icon: <Home size={18} />, label: 'Dashboard' },
  { path: '/users', icon: <Users size={18} />, label: 'Users' },
  { path: '/workflows', icon: <BarChart2 size={18} />, label: 'Workflows' },
  { path: '/admin/assignments', icon: <UserPlus size={18} />, label: 'Assignments' },
  { path: '/admin/rbac', icon: <Shield size={18} />, label: 'RBAC Access' },
  { path: '/admin/leaves', icon: <ClipboardList size={18} />, label: 'Leave Requests' },
  { path: '/admin/attendance', icon: <Clock size={18} />, label: 'Attendance' },
  { path: '/settings', icon: <Settings size={18} />, label: 'Settings' },
]

export default function AdminSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [myRole, setMyRole] = useState<string>('')
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) {
        setUser({ name: u.user_metadata?.name || u.email?.split('@')[0] || 'User', email: u.email || '' })
      }
    })
    getMyRole().then(setMyRole)
  }, [])

  return (
    <aside className="dash-sidebar">
      <div className="dash-logo">
        <div className="dash-logo-img-wrap">
          <img src="/logo.png" alt="Logo" className="dash-logo-img" onError={e => { e.currentTarget.style.display = 'none' }} />
          <div className="dash-logo-glow"></div>
        </div>
        <div><span className="dash-logo-name">CliCLTake</span><span className="dash-logo-sub">Admin Panel</span></div>
      </div>

      <nav className="dash-nav">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`dash-nav-item${active ? ' active' : ''}`}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {active && <ChevronRight size={14} className="dash-nav-arrow" />}
            </button>
          )
        })}
      </nav>

      <div className="dash-sidebar-footer">
        <div className="dash-user-mini">
          <div className="dash-avatar-sm" style={{ position: 'relative' }}>
            {user?.name?.charAt(0).toUpperCase()}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isOnline ? '#10b981' : '#6b7280', border: '2px solid var(--bg-card)' }} />
          </div>
          <div>
            <p className="dash-mini-name">{user?.name}</p>
            <p className="dash-mini-email">{user?.email}</p>
            <p style={{ fontSize: '11px', color: isOnline ? '#10b981' : '#6b7280', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isOnline ? <><Wifi size={10} /> ONLINE</> : <><WifiOff size={10} /> OFFLINE</>}
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
  )
}
