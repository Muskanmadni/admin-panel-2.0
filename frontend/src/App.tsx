// src/App.tsx
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { api } from './lib/api'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgetPassword'
import ResetPassword from './pages/Resetpassword'
import Dashboard from './pages/admin/Dashboard'
import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import Settings from './pages/admin/Settings'
import Users from './pages/admin/Users'
import ProtectedRoute from './components/ProtectedRoute'
import { useInactivity } from './hooks/useInactivity'
import RBACPage from './pages/admin/RBACPage'
import Workflows from './pages/admin/workflows'
import AdminAssignments from './pages/admin/AdminAssignments'
import AdminLeave from './pages/admin/AdminLeave'
import AdminAttendance from './pages/admin/AdminAttendance'
import AdminTimeTracking from './pages/admin/TimeTracking'
import AnnouncementManagement from './pages/admin/AnnouncementsManagement'
import AdminNotifications from './pages/admin/AdminNotifications'
import ProjectReport from './pages/admin/ProjectReport'
import LiveActivity from './pages/admin/LiveActivity'
import { SettingsProvider } from './lib/SettingsContext'

const ADMIN_ROLES = ['admin', 'super_admin']

function AppRoutes({
  isAuthenticated,
  setIsAuthenticated,
  userId,
  userRole,
}: {
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  userId: string | null
  userRole: string | null
}) {
  useInactivity(isAuthenticated ? userId : null)

  const homePath = isAuthenticated
    ? ADMIN_ROLES.includes(userRole ?? '') ? '/dashboard' : '/employee-dashboard'
    : '/login'

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<Login setIsAuthenticated={setIsAuthenticated} />} />
      <Route path="/signup"          element={<Signup setIsAuthenticated={setIsAuthenticated} />} />
      <Route path="/signup/*"        element={<Navigate to="/signup" replace />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protected */}
      <Route path="/dashboard"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/employee-dashboard" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
      <Route path="/settings"           element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/users"              element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/workflows"          element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
      <Route path="/admin/rbac"         element={<ProtectedRoute><RBACPage /></ProtectedRoute>} />
      <Route path="/admin/assignments"  element={<ProtectedRoute><AdminAssignments /></ProtectedRoute>} />
      <Route path="/admin/project-reports" element={<ProtectedRoute><ProjectReport /></ProtectedRoute>} />
      <Route path="/admin/leaves"       element={<ProtectedRoute><AdminLeave /></ProtectedRoute>} />
      <Route path="/admin/attendance"   element={<ProtectedRoute><AdminAttendance /></ProtectedRoute>} />
      <Route path="/admin/time-tracking" element={<ProtectedRoute><AdminTimeTracking /></ProtectedRoute>} />
      <Route path="/admin/announcements" element={<ProtectedRoute><AnnouncementManagement /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute><AdminNotifications /></ProtectedRoute>} />
      <Route path="/admin/activity" element={<ProtectedRoute><LiveActivity /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to={homePath} replace />} />
      <Route path="*" element={<Navigate to={homePath} replace />} />
    </Routes>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId]                   = useState<string | null>(null)
  const [userRole, setUserRole]               = useState<string | null>(null)
  const [loading, setLoading]                 = useState(true)

  const loadRole = async () => {
    try {
      const me = await api.get<{ role: string }>('/users/me')
      setUserRole(me.role)
    } catch {
      setUserRole('employee')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null
      setIsAuthenticated(!!data.session)
      setUserId(uid)
      if (uid) loadRole().finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null
      setIsAuthenticated(!!session)
      setUserId(uid)
      if (uid) loadRole()
      else setUserRole(null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <SettingsProvider>
      <Router>
        <AppRoutes
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          userId={userId}
          userRole={userRole}
        />
      </Router>
    </SettingsProvider>
  )
}

export default App
