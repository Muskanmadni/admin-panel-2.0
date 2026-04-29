import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import '../styles/Forgotpassword.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) { setError('Email is required'); return }
    if (!validateEmail(email)) { setError('Please enter a valid email'); return }

    setIsLoading(true)
    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (supabaseError) {
        setError(supabaseError.message)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout title="Check Your Email" subtitle="Password reset link sent!">
        <div className="success-container">
          <CheckCircle size={64} className="success-icon" />
          <p className="success-text">
            We've sent a reset link to <strong>{email}</strong>.
            Click the link in your email to set a new password.
          </p>
          <p className="success-note">Don't see it? Check your spam folder.</p>
          <Link to="/login" className="submit-btn" style={{ textAlign: 'center', display: 'block', marginTop: '1.5rem' }}>
            ← Back to Login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset Password" subtitle="We'll send you a link to reset your password">
      <form onSubmit={handleSubmit} className="forgot-form">
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrapper">
            <Mail className="input-icon" size={20} />
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              className={error ? 'error' : ''}
            />
          </div>
          {error && <span className="error-text">{error}</span>}
        </div>

        <p className="info-text">
          Enter the email address associated with your account, and we'll send you a link to reset your password.
        </p>

        <button type="submit" disabled={isLoading} className="submit-btn">
          {isLoading ? (<><span className="spinner"></span>Sending...</>) : (<>Send Reset Link<ArrowRight size={18} /></>)}
        </button>
      </form>

      <div className="back-link-container">
        <Link to="/login" className="back-link">← Back to login</Link>
      </div>
    </AuthLayout>
  )
}