import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, User, Building2,
  ArrowRight, Check, X, AlertCircle, Camera,
} from 'lucide-react'

import AuthLayout from '../components/AuthLayout'
import FaceCapture, { type FacePhotoUrls } from '../components/FaceCapture'
import PolicyConsent from '../components/PolicyConsent'
import {
  allPoliciesAccepted,
  DEFAULT_POLICY_DOCUMENTS,
  fetchPolicyDocuments,
  type PolicyDocument,
} from '../lib/policyDocuments'
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

export default function Signup(_props: SignupProps) {
  const [empForm, setEmpForm] = useState({ name: '', email: '', password: '', confirm: '', department: '', role: '' })
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [success, setSuccess]           = useState(false)
  const [dbError, setDbError]           = useState<string | null>(null)
  const [showFaceCapture, setShowFaceCapture] = useState(false)
  const [pendingAuthData, setPendingAuthData] = useState<{ userId: string; email: string; name: string } | null>(null)
  const [policyDocuments, setPolicyDocuments] = useState<PolicyDocument[]>([])
  const [acceptedPolicies, setAcceptedPolicies] = useState<Record<string, boolean>>({
    terms: false,
    policies: false,
  })

  useEffect(() => {
    fetchPolicyDocuments().then(setPolicyDocuments)
  }, [])

  const policiesAccepted = allPoliciesAccepted(acceptedPolicies, policyDocuments)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!empForm.name.trim())    e.name     = 'Full name is required'
    if (!empForm.email.trim())   e.email    = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empForm.email)) e.email = 'Invalid email'
    if (!empForm.password)       e.password = 'Password is required'
    else if (empForm.password.length < 8) e.password = 'Min 8 characters'
    if (empForm.confirm !== empForm.password) e.confirm = 'Passwords do not match'
    const docs = policyDocuments.length ? policyDocuments : DEFAULT_POLICY_DOCUMENTS
    docs.forEach(doc => {
      if (!acceptedPolicies[doc.id]) {
        e[doc.id] = `You must accept the ${doc.label}`
      }
    })
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDbError(null)

    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setIsLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: empForm.email,
        password: empForm.password,
        options: {
          data: {
            full_name: empForm.name,
            account_type: 'employee',
          },
        },
      })

      if (authError) {
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

      setPendingAuthData({ userId: authData.user.id, email: empForm.email, name: empForm.name })
      setIsLoading(false)
      setShowFaceCapture(true)
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const finishRegistration = async (
    userId: string,
    email: string,
    name: string,
    photoUrls: FacePhotoUrls | null,
  ) => {
    const assignedRole = 'employee'

    const { error: profileError } = await dbHelpers.createUserProfile({
      user_id: userId,
      name,
      email,
      role: assignedRole,
      account_type: 'employee',
    })
    if (profileError) console.warn('Profile save failed, will retry on next login')

    try {
      await api.post('/users/register', {
        user_id: userId,
        email,
        full_name: name,
        user_type: 'employee',
        role: assignedRole,
        department: empForm.department || undefined,
        position: empForm.role || undefined,
        face_photo_urls: photoUrls ?? undefined,
      })
    } catch (err) {
      console.error('Neon sync failed:', err)
    }

    setSuccess(true)
  }

  const handleFaceCaptureComplete = async (urls: FacePhotoUrls) => {
    if (!pendingAuthData) return
    setIsLoading(true)
    try {
      await finishRegistration(pendingAuthData.userId, pendingAuthData.email, pendingAuthData.name, urls)
      setShowFaceCapture(false)
    } catch (err) {
      setDbError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  if (showFaceCapture && pendingAuthData) {
    return (
      <AuthLayout title="Face Verification 📸" subtitle="Take 3 photos: front, left, right">
        {dbError && (
          <div className="error-banner" style={{ marginBottom: '12px' }}>
            <AlertCircle size={16} /> {dbError}
          </div>
        )}
        <FaceCapture
          userId={pendingAuthData.userId}
          onComplete={handleFaceCaptureComplete}
          onError={msg => setDbError(msg)}
        />
        {isLoading && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '8px' }}>
            <span className="spinner" /> Finishing registration…
          </p>
        )}
      </AuthLayout>
    )
  }

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

  return (
    <AuthLayout title="Join as Employee" subtitle="Create your employee account">
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

        <Field label="Full Name" icon={<User size={20} />} error={errors.name}>
          <input type="text" value={empForm.name} placeholder="Jane Doe"
            className={errors.name ? 'error' : ''}
            onChange={e => { setEmpForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })) }} />
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

        <PolicyConsent
          accepted={acceptedPolicies}
          onAcceptedChange={(id, value) => {
            setAcceptedPolicies(prev => ({ ...prev, [id]: value }))
            setErrors(prev => ({ ...prev, [id]: '' }))
          }}
          errors={{
            terms: errors.terms,
            policies: errors.policies,
          }}
        />

        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
          fontSize: '13px', color: '#93c5fd',
        }}>
          <Camera size={18} style={{ flexShrink: 0 }} />
          <span>After submitting, you'll take <strong>3 face photos</strong> (front, left, right) for identity verification.</span>
        </div>

        <button type="submit" disabled={isLoading || !policiesAccepted} className="submit-btn">
          {isLoading
            ? <><span className="spinner" />Creating account...</>
            : <>Continue to Face Capture <Camera size={18} /></>}
        </button>
      </form>

      <div className="toggle-auth">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  )
}

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
