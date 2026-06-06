import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, dbHelpers } from '../lib/supabase'
import {
  requestNotificationPermission,
  showDesktopNotification,
} from '../lib/desktopNotifications'

const TIMEOUT_MS = 20 * 60 * 1000
const WARNING_BEFORE_MS = 2 * 60 * 1000
const WARNING_AT_MS = TIMEOUT_MS - WARNING_BEFORE_MS

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const

export const ADMIN_INACTIVITY_MINUTES = TIMEOUT_MS / 60_000
export const ADMIN_INACTIVITY_WARNING_MINUTES = WARNING_BEFORE_MS / 60_000

/**
 * Admin dashboard session: 20 minutes without activity logs the user out.
 * Shows a desktop notification ~2 minutes before logout.
 */
export function useInactivity(userId: string | null) {
  const navigate = useNavigate()
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningShownRef = useRef(false)
  const logoutInProgressRef = useRef(false)

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
      logoutTimerRef.current = null
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
      warningTimerRef.current = null
    }
  }, [])

  const logout = useCallback(async () => {
    if (logoutInProgressRef.current) return
    logoutInProgressRef.current = true

    try {
      if (userId) {
        await dbHelpers.updatePresence(userId, false)
      }
    } catch {
      /* best-effort */
    }

    await supabase.auth.signOut()
    sessionStorage.setItem('logout_reason', 'admin_inactivity')
    navigate('/login', { replace: true })
  }, [userId, navigate])

  const showWarning = useCallback(() => {
    const body = `No activity detected on the admin dashboard. You will be logged out in ${ADMIN_INACTIVITY_WARNING_MINUTES} minutes unless you move your mouse or use the keyboard.`
    showDesktopNotification('Admin session ending soon', body)
  }, [])

  const resetSession = useCallback(() => {
    if (!userId) return
    clearTimers()
    warningShownRef.current = false

    warningTimerRef.current = setTimeout(() => {
      if (warningShownRef.current) return
      warningShownRef.current = true
      showWarning()
    }, WARNING_AT_MS)

    logoutTimerRef.current = setTimeout(() => {
      void logout()
    }, TIMEOUT_MS)
  }, [userId, clearTimers, showWarning, logout])

  useEffect(() => {
    if (!userId) {
      clearTimers()
      warningShownRef.current = false
      logoutInProgressRef.current = false
      return
    }

    requestNotificationPermission()
    resetSession()

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, resetSession, { passive: true })
    )

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, resetSession)
      )
      clearTimers()
      warningShownRef.current = false
    }
  }, [userId, resetSession, clearTimers])
}
