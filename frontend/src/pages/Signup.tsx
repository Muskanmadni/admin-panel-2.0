import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, User, Building2, Globe,
  ArrowRight, Check, X, AlertCircle,
} from 'lucide-react'

import AuthLayout from '../components/AuthLayout'
import { supabase, dbHelpers } from '../lib/supabase'
import { api } from '../lib/api'
import '../styles/Signup.css'

interface SignupProps {
  setIsAuthenticated: (value: boolean) => void
}

const checks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter',   test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number',             test: (p: string) => /\d/.test(p) },
  { label: 'One special character',  test: (p: string) => /[!@#$%^&*]/.test(p) },
]

export default function Signup({ setIsAuthenticated }: SignupProps) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const type = searchParams.get('type') === 'employee' ? 'employee' : 'individual'

  const [indForm, setIndForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', confirm: '', orgCode: '', department: '', role: '' })
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [success, setSuccess]           = useState(false)
  const [dbError, setDbError]           = useState<string | null>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (type === 'individual') {
      if (!indForm.name.trim())    e.name     = 'Full name is required'
      if (!indForm.email.trim())   e.email    = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(indForm.email)) e.email = 'Invalid email'
      if (!indForm.password)       e.password = 'Password is required'
      else if (indForm.password.length < 8) e.password = 'Min 8 characters'
      if (indForm.confirm !== indForm.password) e.confirm = 'Passwords do not match'
    } else if (type === 'employee') {
      if (!empForm.name.trim())    e.name     = 'Full name is required'
      if (!empForm.email.trim())   e.email    = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empForm.email)) e.email = 'Invalid email'
      if (!empForm.orgCode.trim()) e.orgCode  = 'Organization code is required'
      if (!empForm.password)       e.password = 'Password is required'
      else if (empForm.password.length < 8) e.password = 'Min 8 characters'
      if (empForm.confirm !== empForm.password) e.confirm = 'Passwords do not match'
    }
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDbError(null)

    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsLoading(true)

    try {
      const email    = type === 'individual' ? indForm.email    : empForm.email
      const password = type === 'individual' ? indForm.password : empForm.password
      const name     = type === 'individual' ? indForm.name     : empForm.name

      // ── STEP 1: Create Supabase Auth account ─────────────────────────────
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name:    name,
            account_type: type,
            org_code:     type === 'employee' ? empForm.orgCode : undefined,
          },
        },
      })

      if (authError) {
        // "User already registered" is the most common error — give a clear message
        if (
          authError.message.toLowerCase().includes('already registered') ||
          authError.message.toLowerCase().includes('already exists')
        ) {
          setErrors({ general: 'An account with this email already exists. Try signing in.' })
        } else {
          setErrors({ general: authError.message })
        }
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setErrors({ general: 'Failed to create account. Please try again.' })
        setIsLoading(false)
        return
      }

      // ── STEP 2: All new signups get "employee" role ───────────────────────
      const assignedRole = 'employee'

      // ── STEP 3: Save profile to Supabase user_profiles table ────────────
      const { error: profileError } = await dbHelpers.createUserProfile({
        user_id:      authData.user.id,
        name,
        email,
        role:         assignedRole,
        account_type: type,
        org_code:     type === 'employee' ? empForm.orgCode : undefined,
      })

      if (profileError) {
        console.error('Supabase profile error:', profileError)
        console.warn('Profile save failed, will retry on next login')
      }

      // ── STEP 4: Sync user to Neon database via backend API ──────────────
      try {
        await api.post('/users/register', {
          user_id:    authData.user.id,
          email,
          full_name:  name,
          user_type:  type,
          role:       assignedRole,
          // Employee fields
          org_code:   type === 'employee' ? empForm.orgCode : undefined,
          department: type === 'employee' ? empForm.department : undefined,
          position:   type === 'employee' ? empForm.role : undefined,
        })
        console.log('✅ User synced to Neon database')
      } catch (err) {
        console.error('Neon sync failed:', err)
      }

      setSuccess(true)

    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout title="Check Your Email ✅" subtitle="Confirmation link sent">
        <div className="success-container">
          <div className="success-icon-wrap">
            <Check size={40} color="#34d399" />
          </div>
          <p className="success-text">
            Almost there! Click the link in your inbox to activate your account.
            <br /><br />
            Your account starts as <strong style={{ color: '#3b82f6' }}>Employee</strong> —
            an admin can upgrade your access.
          </p>
          <p className="success-note">Didn't get it? Check your spam folder.</p>
          <Link
            to="/login"
            className="submit-btn"
            style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '8px' }}
          >
            Back to Sign In <ArrowRight size={18} />
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ── Signup form ───────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title={type === 'individual' ? 'Create Account' : 'Join as Employee'}
      subtitle={type === 'individual' ? "Join us today — it's free" : 'Join your organization using code'}
    >
      <div className="account-type-pills">
        <Link to="/signup?type=individual"   className={`pill ${type === 'individual'   ? 'pill-active' : ''}`}>
          👤 Individual
        </Link>
        <Link to="/signup?type=employee" className={`pill ${type === 'employee' ? 'pill-active' : ''}`}>
          💼 Employee
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="login-form" style={{ marginTop: '1rem' }}>

        {errors.general && (
          <div className="error-banner">
            <AlertCircle size={16} /> {errors.general}
          </div>
        )}

        {dbError && (
          <div className="error-banner">
            <AlertCircle size={16} /> Database Error: {dbError}
          </div>
        )}

        {/* INDIVIDUAL FORM */}
        {type === 'individual' && (<>
          <Field label="Full Name" icon={<User size={20} />} error={errors.name}>
            <input type="text" value={indForm.name} placeholder="Jane Doe"
              className={errors.name ? 'error' : ''}
              onChange={e => { setIndForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })) }} />
          </Field>

          <Field label="Email Address" icon={<Mail size={20} />} error={errors.email}>
            <input type="email" value={indForm.email} placeholder="you@example.com"
              className={errors.email ? 'error' : ''}
              onChange={e => { setIndForm(p => ({ ...p, email: e.target.value })); setErrors(p => ({ ...p, email: '' })) }} />
          </Field>

          <Field label="Password" icon={<Lock size={20} />} error={errors.password}
            toggle={<ToggleBtn show={showPassword} onClick={() => setShowPassword(p => !p)} />}>
            <input type={showPassword ? 'text' : 'password'} value={indForm.password}
              placeholder="••••••••" className={errors.password ? 'error' : ''}
              onChange={e => { setIndForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: '' })) }} />
          </Field>

          <PasswordChecklist password={indForm.password} />

          <Field label="Confirm Password" icon={<Lock size={20} />} error={errors.confirm}
            toggle={<ToggleBtn show={showConfirm} onClick={() => setShowConfirm(p => !p)} />}>
            <input type={showConfirm ? 'text' : 'password'} value={indForm.confirm}
              placeholder="••••••••" className={errors.confirm ? 'error' : ''}
              onChange={e => { setIndForm(p => ({ ...p, confirm: e.target.value })); setErrors(p => ({ ...p, confirm: '' })) }} />
          </Field>
        </>)}

        {/* EMPLOYEE FORM */}
        {type === 'employee' && (<>
          <Field label="Full Name" icon={<User size={20} />} error={errors.name}>
            <input type="text" value={empForm.name} placeholder="Jane Doe"
              className={errors.name ? 'error' : ''}
              onChange={e => { setEmpForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })) }} />
          </Field>

          <Field label="Organization Code" icon={<Globe size={20} />} error={errors.orgCode}>
            <input type="text" value={empForm.orgCode} placeholder="e.g. 0022"
              className={errors.orgCode ? 'error' : ''}
              onChange={e => { setEmpForm(p => ({ ...p, orgCode: e.target.value.toLowerCase() })); setErrors(p => ({ ...p, orgCode: '' })) }} />
          </Field>

          <Field label="Department" icon={<Building2 size={20} />} error={errors.department}>
            <input type="text" value={empForm.department} placeholder="Engineering"
              className={errors.department ? 'error' : ''}
              onChange={e => { setEmpForm(p => ({ ...p, department: e.target.value })); setErrors(p => ({ ...p, department: '' })) }} />
          </Field>

          <Field label="Role" icon={<User size={20} />} error={errors.role}>
            <input type="text" value={empForm.role} placeholder="Senior Engineer"
              className={errors.role ? 'error' : ''}
              onChange={e => { setEmpForm(p => ({ ...p, role: e.target.value })); setErrors(p => ({ ...p, role: '' })) }} />
          </Field>

          <Field label="Email Address" icon={<Mail size={20} />} error={errors.email}>
            <input type="email" value={empForm.email} placeholder="you@example.com"
              className={errors.email ? 'error' : ''}
              onChange={e => { setEmpForm(p => ({ ...p, email: e.target.value })); setErrors(p => ({ ...p, email: '' })) }} />
          </Field>

          <Field label="Password" icon={<Lock size={20} />} error={errors.password}
            toggle={<ToggleBtn show={showPassword} onClick={() => setShowPassword(p => !p)} />}>
            <input type={showPassword ? 'text' : 'password'} value={empForm.password}
              placeholder="••••••••" className={errors.password ? 'error' : ''}
              onChange={e => { setEmpForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: '' })) }} />
          </Field>

          <PasswordChecklist password={empForm.password} />

          <Field label="Confirm Password" icon={<Lock size={20} />} error={errors.confirm}
            toggle={<ToggleBtn show={showConfirm} onClick={() => setShowConfirm(p => !p)} />}>
            <input type={showConfirm ? 'text' : 'password'} value={empForm.confirm}
              placeholder="••••••••" className={errors.confirm ? 'error' : ''}
              onChange={e => { setEmpForm(p => ({ ...p, confirm: e.target.value })); setErrors(p => ({ ...p, confirm: '' })) }} />
          </Field>
        </>)}

        <button type="submit" disabled={isLoading} className="submit-btn">
          {isLoading
            ? <><span className="spinner" />Creating account...</>
            : <>Create Account <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="toggle-auth">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, icon, error, toggle, children }: {
  label: string
  icon: React.ReactNode
  error?: string
  toggle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="input-wrapper">
        <span className="input-icon">{icon}</span>
        {children}
        {toggle}
      </div>
      {error && <span className="error-text">{error}</span>}
    </div>
  )
}

function ToggleBtn({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button type="button" className="toggle-password" onClick={onClick}>
      {show ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  )
}

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null
  return (
    <ul className="password-checklist">
      {checks.map(c => (
        <li key={c.label} className={c.test(password) ? 'valid' : 'invalid'}>
          {c.test(password) ? <Check size={11} /> : <X size={11} />} {c.label}
        </li>
      ))}
    </ul>
  )
}