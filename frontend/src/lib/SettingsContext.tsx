// src/lib/SettingsContext.tsx
// Drop this file into: src/lib/SettingsContext.tsx
// Then wrap your <App /> with <SettingsProvider> in main.tsx or App.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export interface OrgSettings {
  orgName: string
  orgTagline: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  theme: 'pink-purple' | 'blue-cyan' | 'green-teal' | 'orange-red' | 'custom'
  sidebarDark: boolean
  compactMode: boolean
  adminEmail: string
  adminName: string
}

export const DEFAULT_SETTINGS: OrgSettings = {
  orgName: 'CliCLTake',
  orgTagline: 'Admin Panel',
  logoUrl: '/logo.png',
  primaryColor: '#ec4899',
  secondaryColor: '#a855f7',
  accentColor: '#8b5cf6',
  theme: 'pink-purple',
  sidebarDark: true,
  compactMode: false,
  adminEmail: '',
  adminName: '',
}

interface SettingsContextValue {
  settings: OrgSettings
  updateSettings: (partial: Partial<OrgSettings>) => void
  saveSettings: (s?: OrgSettings) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  saveSettings: () => {},
  resetSettings: () => {},
})

export const useSettings = () => useContext(SettingsContext)

/** Apply CSS variables to :root so every page reacts instantly */
export const applyThemeVars = (s: OrgSettings) => {
  const r = document.documentElement
  r.style.setProperty('--theme-primary',    s.primaryColor)
  r.style.setProperty('--theme-secondary',  s.secondaryColor)
  r.style.setProperty('--theme-accent',     s.accentColor)
  r.style.setProperty('--color-primary',    s.primaryColor)
  r.style.setProperty('--color-secondary',  s.secondaryColor)
  r.style.setProperty('--color-accent',     s.accentColor)
  // compact mode class on body
  document.body.classList.toggle('compact-mode', s.compactMode)
  document.body.classList.toggle('sidebar-light', !s.sidebarDark)
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<OrgSettings>(() => {
    try {
      const stored = localStorage.getItem('orgSettings')
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  // Apply on first mount
  useEffect(() => {
    applyThemeVars(settings)
  }, []) // eslint-disable-line

  const updateSettings = useCallback((partial: Partial<OrgSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial }
      applyThemeVars(next)
      return next
    })
  }, [])

  const saveSettings = useCallback((s?: OrgSettings) => {
    const toSave = s ?? settings
    localStorage.setItem('orgSettings', JSON.stringify(toSave))
    applyThemeVars(toSave)
    if (s) setSettings(s)
  }, [settings])

  const resetSettings = useCallback(() => {
    localStorage.removeItem('orgSettings')
    setSettings(DEFAULT_SETTINGS)
    applyThemeVars(DEFAULT_SETTINGS)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, saveSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}