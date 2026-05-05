import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, Grid3X3 } from 'lucide-react'
import '../styles/BackButton.css'

interface BackButtonProps {
  to?: string
  label?: string
  showHome?: boolean
  className?: string
  variant?: 'default' | 'minimal' | 'enhanced'
}

export default function BackButton({ 
  to = '/login', 
  label = 'Back to Login', 
  showHome = false,
  className = '',
  variant = 'enhanced'
}: BackButtonProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (to === 'history') {
      navigate(-1)
    } else {
      navigate(to)
    }
  }

  const handleHome = () => {
    navigate('/login')
  }

  if (variant === 'minimal') {
    return (
      <button 
        className={`back-button-minimal ${className}`}
        onClick={handleBack}
        title={label}
      >
        <ArrowLeft size={20} />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <div className={`back-button-wrapper enhanced ${className}`}>
      <button 
        className="back-button enhanced"
        onClick={handleBack}
        title={label}
      >
        <div className="back-icon-wrapper">
          <ArrowLeft size={18} className="back-icon" />
        </div>
        <span className="back-label">{label}</span>
        <div className="back-button-shine" />
      </button>
      
      {showHome && (
        <div className="home-actions">
          <button 
            className="home-button enhanced"
            onClick={handleHome}
            title="Go to Login"
          >
            <Home size={16} className="home-icon" />
            <span>Login</span>
          </button>
          <button 
            className="grid-button enhanced"
            onClick={handleHome}
            title="Login Page"
          >
            <Grid3X3 size={16} className="grid-icon" />
            <span>Login</span>
          </button>
        </div>
      )}
    </div>
  )
}