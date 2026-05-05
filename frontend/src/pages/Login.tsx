import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { supabase, dbHelpers } from '../lib/supabase'
import { api } from '../lib/api'
import '../styles/Login.css'

interface LoginFormData {
  email: string
  password: string
}

interface LoginProps {
  setIsAuthenticated: (value: boolean) => void
}

export default function Login({ setIsAuthenticated }: LoginProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' })
  const [errors, setErrors] = useState<Partial<LoginFormData & { general: string }>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSignupMenu, setShowSignupMenu] = useState(false)
  const [sessionExpiredMsg, setSessionExpiredMsg] = useState('')

  // ── Detect session expiry / inactivity logout ────────────────────────────
  useEffect(() => {
    // Check if redirected here due to inactivity timeout
    const reason = sessionStorage.getItem('logout_reason')
    if (reason === 'inactivity') {
      setSessionExpiredMsg('You were logged out due to 20 minutes of inactivity.')
      sessionStorage.removeItem('logout_reason')
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [setIsAuthenticated])

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof LoginFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSessionExpiredMsg('')

    const newErrors: Partial<LoginFormData> = {}
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!validateEmail(formData.email)) newErrors.email = 'Please enter a valid email'
    if (!formData.password.trim()) newErrors.password = 'Password is required'

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setErrors({ email: 'Please confirm your email before logging in. Check your inbox.' })
        } else {
          setErrors({ email: 'Invalid email or password' })
        }
        return
      }

      if (data.user) {
        // Sync to Neon if not already there
        try {
          await api.post('/users/register', {
            user_id:    data.user.id,
            email:      data.user.email,
            full_name:  data.user.user_metadata?.full_name || '',
            role:       'employee',
          })
        } catch {
          // Ignore sync errors on login
        }

        // Fetch role and redirect accordingly
        try {
          const me = await api.get<{ role: string }>('/users/me')
          const isAdmin = me.role === 'admin' || me.role === 'super_admin'
          setIsAuthenticated(true)
          navigate(isAdmin ? '/dashboard' : '/employee-dashboard')
        } catch {
          setIsAuthenticated(true)
          navigate('/employee-dashboard')
        }
      }
    } catch {
      setErrors({ email: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Access Your Dashboard Securely">

      {/* ── Inactivity / session expired notice ──────────────────────────── */}
      {sessionExpiredMsg && (
        <div className="remote-logout-notice">{sessionExpiredMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="login-form">
        {errors.general && <div className="error-banner">{errors.general}</div>}

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={20} />
            <input type="email" id="email" name="email" value={formData.email}
              onChange={handleChange} placeholder="you@example.com"
              className={errors.email ? 'error' : ''} />
          </div>
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input type={showPassword ? 'text' : 'password'} id="password"
              name="password" value={formData.password} onChange={handleChange}
              placeholder="••••••••" className={errors.password ? 'error' : ''} />
            <button type="button" className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        {/* Forgot Password */}
        <div className="forgot-password">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading} className="submit-btn">
          {isLoading
            ? <><span className="spinner"></span>Signing in...</>
            : <>Sign In <ArrowRight size={18} /></>}
        </button>
      </form>

      {/* ── Split Signup ─────────────────────────────────────────────────── */}
      <div className="toggle-auth">
        Don't have an account?{' '}
        <button
          className="signup-trigger"
          onClick={() => setShowSignupMenu(prev => !prev)}
        >
          Sign up ▾
        </button>
      </div>

      {showSignupMenu && (
        <div className="signup-menu">
          <Link to="/signup?type=individual" className="signup-option" onClick={() => setShowSignupMenu(false)}>
            <span className="signup-option-icon">👤</span>
            <div>
              <strong>Individual</strong>
              <small>Personal account for one user</small>
            </div>
          </Link>
          <Link to="/signup?type=employee" className="signup-option" onClick={() => setShowSignupMenu(false)}>
            <span className="signup-option-icon">💼</span>
            <div>
              <strong>Employee</strong>
              <small>Join your organization using code</small>
            </div>
          </Link>
          <Link to="/signup?type=organization" className="signup-option" onClick={() => setShowSignupMenu(false)}>
            <span className="signup-option-icon">🏢</span>
            <div>
              <strong>Organization</strong>
              <small>Team account with admin controls</small>
            </div>
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}