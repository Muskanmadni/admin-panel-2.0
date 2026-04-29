import React from 'react'
import '../styles/AuthLayout.css'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <div className="auth-background">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
        <div className="gradient-blob blob-3"></div>
        <div className="grid-overlay"></div>
        <div className="particles" id="particles"></div>
      </div>

      <div className="auth-container">
        <div className="auth-wrapper">
          <div className="auth-header">

            {/* ✅ LOGO — replace logo.png with your actual file */}
            <div className="logo-wrapper">
              <div className="logo">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="logo-image"
                  onError={(e) => {
                    // Falls back to Zap icon if logo not found
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            </div>

            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          <div className="auth-form-wrapper">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}