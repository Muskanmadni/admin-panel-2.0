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
  const type = searchParams.get('type') === 'organization' ? 'organization' : 'individual'

  const [indForm, setIndForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [orgForm, setOrgForm] = useState({ orgName: '', subdomain: '', adminName: '', email: '', password: '', confirm: '' })
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
    } else {
      if (!orgForm.orgName.trim())   e.orgName   = 'Organization name is required'
      if (!orgForm.subdomain.trim()) e.subdomain = 'Subdomain is required'
      else if (!/^[a-z0-9-]+$/.test(orgForm.subdomain)) e.subdomain = 'Lowercase, numbers, hyphens only'
      if (!orgForm.adminName.trim()) e.adminName = 'Admin full name is required'
      if (!orgForm.email.trim())     e.email     = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orgForm.email)) e.email = 'Invalid email'
      if (!orgForm.password)         e.password  = 'Password is required'
      else if (orgForm.password.length < 8) e.password = 'Min 8 characters'
      if (orgForm.confirm !== orgForm.password) e.confirm = 'Passwords do not match'
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
      const email    = type === 'individual' ? indForm.email    : orgForm.email
      const password = type === 'individual' ? indForm.password : orgForm.password
      const name     = type === 'individual' ? indForm.name     : orgForm.adminName

      // ── STEP 1: Create Supabase Auth account ─────────────────────────────
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name:    name,
            account_type: type,
            org_name:     type === 'organization' ? orgForm.orgName   : undefined,
            subdomain:    type === 'organization' ? orgForm.subdomain : undefined,
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
        org_name:     type === 'organization' ? orgForm.orgName   : undefined,
        subdomain:    type === 'organization' ? orgForm.subdomain : undefined,
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
          // Organization fields
          org_name:   type === 'organization' ? orgForm.orgName   : undefined,
          subdomain:  type === 'organization' ? orgForm.subdomain : undefined,
          // Individual fields (can add more if needed)
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
      title={type === 'individual' ? 'Create Account' : 'Create Organization'}
      subtitle={type === 'individual' ? "Join us today — it's free" : 'Set up your team workspace'}
    >
      <div className="account-type-pills">
        <Link to="/signup?type=individual"   className={`pill ${type === 'individual'   ? 'pill-active' : ''}`}>
          👤 Individual
        </Link>
        <Link to="/signup?type=organization" className={`pill ${type === 'organization' ? 'pill-active' : ''}`}>
          🏢 Organization
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

        {/* ORGANIZATION FORM */}
        {type === 'organization' && (<>
          <Field label="Organization Name" icon={<Building2 size={20} />} error={errors.orgName}>
            <input type="text" value={orgForm.orgName} placeholder="Acme Corp"
              className={errors.orgName ? 'error' : ''}
              onChange={e => { setOrgForm(p => ({ ...p, orgName: e.target.value })); setErrors(p => ({ ...p, orgName: '' })) }} />
          </Field>

          <Field label="Subdomain" icon={<Globe size={20} />} error={errors.subdomain}>
            <input type="text" value={orgForm.subdomain} placeholder="acme"
              className={errors.subdomain ? 'error' : ''}
              onChange={e => { setOrgForm(p => ({ ...p, subdomain: e.target.value.toLowerCase() })); setErrors(p => ({ ...p, subdomain: '' })) }} />
            {orgForm.subdomain && <span className="subdomain-preview">{orgForm.subdomain}.yourapp.com</span>}
          </Field>

          <Field label="Admin Full Name" icon={<User size={20} />} error={errors.adminName}>
            <input type="text" value={orgForm.adminName} placeholder="John Smith"
              className={errors.adminName ? 'error' : ''}
              onChange={e => { setOrgForm(p => ({ ...p, adminName: e.target.value })); setErrors(p => ({ ...p, adminName: '' })) }} />
          </Field>

          <Field label="Admin Email" icon={<Mail size={20} />} error={errors.email}>
            <input type="email" value={orgForm.email} placeholder="admin@acme.com"
              className={errors.email ? 'error' : ''}
              onChange={e => { setOrgForm(p => ({ ...p, email: e.target.value })); setErrors(p => ({ ...p, email: '' })) }} />
          </Field>

          <Field label="Password" icon={<Lock size={20} />} error={errors.password}
            toggle={<ToggleBtn show={showPassword} onClick={() => setShowPassword(p => !p)} />}>
            <input type={showPassword ? 'text' : 'password'} value={orgForm.password}
              placeholder="••••••••" className={errors.password ? 'error' : ''}
              onChange={e => { setOrgForm(p => ({ ...p, password: e.target.value })); setErrors(p => ({ ...p, password: '' })) }} />
          </Field>

          <PasswordChecklist password={orgForm.password} />

          <Field label="Confirm Password" icon={<Lock size={20} />} error={errors.confirm}
            toggle={<ToggleBtn show={showConfirm} onClick={() => setShowConfirm(p => !p)} />}>
            <input type={showConfirm ? 'text' : 'password'} value={orgForm.confirm}
              placeholder="••••••••" className={errors.confirm ? 'error' : ''}
              onChange={e => { setOrgForm(p => ({ ...p, confirm: e.target.value })); setErrors(p => ({ ...p, confirm: '' })) }} />
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