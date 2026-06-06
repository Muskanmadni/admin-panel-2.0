import { useEffect, useRef, useCallback } from 'react'
import {
  requestNotificationPermission,
  showDesktopNotification,
} from '../lib/desktopNotifications'

export { requestNotificationPermission, showDesktopNotification } from '../lib/desktopNotifications'

const SESSION_TIMEOUT_MS = 10 * 60 * 1000
const WARNING_BEFORE_MS = 2 * 60 * 1000
const WARNING_AT_MS = SESSION_TIMEOUT_MS - WARNING_BEFORE_MS

interface UseTimeTrackingInactivityOptions {
  enabled: boolean
  onWarning: () => void
  onTimeout: () => void | Promise<void>
}

/**
 * Logs out after 10 minutes without cursor movement (mousemove only).
 * Fires onWarning ~2 minutes before session ends.
 */
export function useTimeTrackingInactivity({
  enabled,
  onWarning,
  onTimeout,
}: UseTimeTrackingInactivityOptions) {
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningShownRef = useRef(false)
  const onWarningRef = useRef(onWarning)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onWarningRef.current = onWarning
    onTimeoutRef.current = onTimeout
  }, [onWarning, onTimeout])

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

  const resetSession = useCallback(() => {
    clearTimers()
    warningShownRef.current = false

    warningTimerRef.current = setTimeout(() => {
      if (warningShownRef.current) return
      warningShownRef.current = true
      onWarningRef.current()
    }, WARNING_AT_MS)

    logoutTimerRef.current = setTimeout(() => {
      void onTimeoutRef.current()
    }, SESSION_TIMEOUT_MS)
  }, [clearTimers])

  useEffect(() => {
    if (!enabled) {
      clearTimers()
      warningShownRef.current = false
      return
    }

    requestNotificationPermission()
    resetSession()

    const onMouseMove = () => resetSession()
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      clearTimers()
      warningShownRef.current = false
    }
  }, [enabled, resetSession, clearTimers])
}

export const TIME_TRACKING_SESSION_MINUTES = SESSION_TIMEOUT_MS / 60_000
export const TIME_TRACKING_WARNING_MINUTES = WARNING_BEFORE_MS / 60_000
