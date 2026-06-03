const PKT = 'Asia/Karachi'

/** Today's date (YYYY-MM-DD) in Pakistan Standard Time */
export function getPakistanToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PKT }).format(new Date())
}

/** Format stored HH:MM attendance time for display in PKT */
export function formatPktClock(time: string | null | undefined): string {
  if (!time) return '—'
  const parts = time.split(':')
  const h = Number(parts[0])
  const m = Number(parts[1])
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period} PKT`
}

/** Format YYYY-MM-DD date label in PKT context */
export function formatPktDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('en-US', {
    timeZone: PKT,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
