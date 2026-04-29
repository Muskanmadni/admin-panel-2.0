import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import '../styles/Resetpassword.css'

interface ResetFormData {
  password: string
  confirmPassword: string
}

interface PasswordStrength {
  hasMinLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ResetFormData>({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Partial<ResetFormData>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionError, setSessionError] = useState('')

  // ✅ Supabase sends token in URL hash — this picks it up automatically
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Check if already in recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
      else {
        // Give it a moment for hash to be parsed
        setTimeout(() => {
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) setSessionReady(true)
            else setSessionError('Invalid or expired reset link. Please request a new one.')
          })
        }, 1000)
      }
    })
  }, [])

  const passwordStrength: PasswordStrength = {
    hasMinLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  }

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name as keyof ResetFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Partial<ResetFormData> = {}

    if (!formData.password.trim()) newErrors.password = 'Password is required'
    else if (!isPasswordStrong) newErrors.password = 'Password does not meet all requirements'

    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your password'
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.password })

      if (error) {
        setErrors({ password: error.message })
      } else {
        setSuccess(true)
        setTimeout(() => navigate('/login'), 3000)
      }
    } catch (err) {
      setErrors({ password: 'An error occurred. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Success screen
  if (success) {
    return (
      <AuthLayout title="Password Updated!" subtitle="Your password has been changed successfully">
        <div className="success-container">
          <CheckCircle size={64} className="success-icon" />
          <p className="success-text">Your password has been reset successfully!</p>
          <p className="success-note">Redirecting you to login in 3 seconds...</p>
          <Link to="/login" className="submit-btn" style={{ textAlign: 'center', display: 'block', marginTop: '1.5rem' }}>
            Go to Login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ✅ Invalid link screen
  if (sessionError) {
    return (
      <AuthLayout title="Link Expired" subtitle="This reset link is no longer valid">
        <div className="success-container">
          <p className="error-text" style={{ textAlign: 'center', marginBottom: '1rem' }}>{sessionError}</p>
          <Link to="/forgot-password" className="submit-btn" style={{ textAlign: 'center', display: 'block' }}>
            Request New Link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // ✅ Loading while session is being read from URL
  if (!sessionReady) {
    return (
      <AuthLayout title="Please Wait" subtitle="Verifying your reset link...">
        <div className="success-container" style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ margin: '0 auto', display: 'block' }}></span>
          <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Verifying link...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create New Password" subtitle="Enter your new password below">
      <form onSubmit={handleSubmit} className="reset-form">

        {/* New Password */}
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password" name="password"
              value={formData.password} onChange={handleChange}
              placeholder="••••••••"
              className={errors.password ? 'error' : ''}
            />
            <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && <span className="error-text">{errors.password}</span>}

          {/* Live password checklist */}
          {formData.password.length > 0 && (
            <ul className="password-checklist">
              <li className={passwordStrength.hasMinLength ? 'valid' : 'invalid'}>✔ At least 8 characters</li>
              <li className={passwordStrength.hasUppercase ? 'valid' : 'invalid'}>✔ One uppercase letter (A-Z)</li>
              <li className={passwordStrength.hasLowercase ? 'valid' : 'invalid'}>✔ One lowercase letter (a-z)</li>
              <li className={passwordStrength.hasNumber ? 'valid' : 'invalid'}>✔ One number (0-9)</li>
              <li className={passwordStrength.hasSpecialChar ? 'valid' : 'invalid'}>✔ One special character (!@#$...)</li>
            </ul>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="input-wrapper">
            <Lock className="input-icon" size={20} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword" name="confirmPassword"
              value={formData.confirmPassword} onChange={handleChange}
              placeholder="••••••••"
              className={errors.confirmPassword ? 'error' : ''}
            />
            <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading} className="submit-btn">
          {isLoading ? (<><span className="spinner"></span>Updating...</>) : (<>Update Password<ArrowRight size={18} /></>)}
        </button>
      </form>

      <div className="back-link-container">
        <Link to="/login" className="back-link">← Back to login</Link>
      </div>
    </AuthLayout>
  )
}