export function requestNotificationPermission(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

export function showDesktopNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  const icon = '/logo.png'
  const show = () => {
    try {
      new Notification(title, { body, icon })
    } catch {
      /* ignore */
    }
  }
  if (Notification.permission === 'granted') {
    show()
  } else if (Notification.permission === 'default') {
    void Notification.requestPermission().then((p) => {
      if (p === 'granted') show()
    })
  }
}
