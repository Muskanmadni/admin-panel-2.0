// src/App.tsx  — replace your existing App.tsx with this

import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgetPassword'
import ResetPassword from './pages/Resetpassword'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Users from './pages/Users'
import ProtectedRoute from './components/ProtectedRoute'
import { useInactivity } from './hooks/useInactivity'
import RBACPage from './lib/RBAC/RBACPage'
import { SettingsProvider } from './lib/SettingsContext'   // ← NEW

function AppRoutes({
  isAuthenticated,
  setIsAuthenticated,
  userId,
}: {
  isAuthenticated: boolean
  setIsAuthenticated: (v: boolean) => void
  userId: string | null
}) {
  useInactivity(isAuthenticated ? userId : null)

  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<Login setIsAuthenticated={setIsAuthenticated} />} />
      <Route path="/signup"          element={<Signup setIsAuthenticated={setIsAuthenticated} />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protected */}
      <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/users"      element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/admin/rbac" element={<ProtectedRoute><RBACPage /></ProtectedRoute>} />

      {/* Default */}
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userId, setUserId]                   = useState<string | null>(null)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(!!data.session)
      setUserId(data.session?.user?.id ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      setUserId(session?.user?.id ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    // SettingsProvider wraps the ENTIRE app — every page gets live settings
    <SettingsProvider>
      <Router>
        <AppRoutes
          isAuthenticated={isAuthenticated}
          setIsAuthenticated={setIsAuthenticated}
          userId={userId}
        />
      </Router>
    </SettingsProvider>
  )
}

export default App