const STORAGE_KEY = 'employee_active_timer_v1'

export interface ActiveTimerState {
  startTime: string
  activeProject: string
  activeTask: string
  activeTag: string
}

export function loadActiveTimer(): ActiveTimerState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveTimerState
    if (!parsed.startTime) return null
    return parsed
  } catch {
    return null
  }
}

export function saveActiveTimer(state: ActiveTimerState): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearActiveTimer(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function elapsedFromStored(startTimeIso: string): number {
  const start = new Date(startTimeIso).getTime()
  if (Number.isNaN(start)) return 0
  return Math.max(0, Math.floor((Date.now() - start) / 1000))
}
