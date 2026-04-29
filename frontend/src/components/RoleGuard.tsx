import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { getMyRole, Role } from '../lib/roles'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: Role[]
  fallback?: React.ReactNode
}

export default function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyRole().then(r => {
      setRole(r)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '200px'
    }}>
      <div className="dash-spinner" />
    </div>
  )

  if (!role || !allowedRoles.includes(role)) {
    return fallback ? <>{fallback}</> : (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: '16px', textAlign: 'center', padding: '40px'
      }}>
        <div style={{ fontSize: '64px' }}>🔒</div>
        <h2 style={{ color: '#f0e6ff', fontSize: '22px', fontWeight: 700 }}>
          Access Restricted
        </h2>
        <p style={{ color: '#9d7baa', fontSize: '14px', maxWidth: '320px' }}>
          You don't have permission to view this page. Contact your admin to upgrade your role.
        </p>
        <div style={{
          padding: '6px 16px',
          background: 'rgba(236,72,153,0.1)',
          border: '1px solid rgba(236,72,153,0.3)',
          borderRadius: '20px',
          color: '#f9a8d4', fontSize: '13px', fontWeight: 600
        }}>
          Your role: {role || 'Unknown'}
        </div>
      </div>
    )
  }

  return <>{children}</>
}