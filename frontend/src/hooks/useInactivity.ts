// src/hooks/useInactivity.ts
import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, dbHelpers } from '../lib/supabase'

const TIMEOUT_MS = 20 * 60 * 1000 // 20 minutes

/**
 * useInactivity
 * – Watches mouse/keyboard/touch/scroll events
 * – If userId is provided (user is logged in), resets a 20-min timer on every event
 * – When the timer fires: marks user offline, signs out, redirects to /login
 *   with a sessionStorage flag so Login can show the "logged out due to inactivity" message
 */
export function useInactivity(userId: string | null) {
  const navigate = useNavigate()
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = useCallback(async () => {
    try {
      if (userId) {
        await dbHelpers.updatePresence(userId, false)
      }
    } catch (_) {
      // best-effort — don't block logout
    }

    await supabase.auth.signOut()

    // Tell the Login page WHY we redirected
    sessionStorage.setItem('logout_reason', 'inactivity')
    navigate('/login', { replace: true })
  }, [userId, navigate])

  const resetTimer = useCallback(() => {
    if (!userId) return          // not logged in — do nothing
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(logout, TIMEOUT_MS)
  }, [userId, logout])

  useEffect(() => {
    if (!userId) {
      // User logged out externally — clear any running timer
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))

    // Start the timer immediately when the user logs in
    resetTimer()

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [userId, resetTimer])
}