// src/pages/Settings.tsx — replace your existing Settings.tsx

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon, Palette, Building2, Image,
  Save, RotateCcw, LogOut, Bell, User, Check
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSettings, OrgSettings } from '../../lib/SettingsContext'
import { getMyRole } from './Dashboard'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/adminStyling/Dashboard.css'
import '../../styles/adminStyling/Settings.css'

const THEMES = [
  { id: 'pink-purple', name: 'Pink & Purple', primary: '#ec4899', secondary: '#a855f7', accent: '#8b5cf6', preview: ['#ec4899', '#a855f7', '#8b5cf6'] },
  { id: 'blue-cyan',   name: 'Blue & Cyan',   primary: '#3b82f6', secondary: '#06b6d4', accent: '#0ea5e9', preview: ['#3b82f6', '#06b6d4', '#0ea5e9'] },
  { id: 'green-teal',  name: 'Green & Teal',  primary: '#10b981', secondary: '#14b8a6', accent: '#059669', preview: ['#10b981', '#14b8a6', '#059669'] },
  { id: 'orange-red',  name: 'Orange & Red',  primary: '#f97316', secondary: '#ef4444', accent: '#f59e0b', preview: ['#f97316', '#ef4444', '#f59e0b'] },
  { id: 'custom',      name: 'Custom',        primary: '#ec4899', secondary: '#a855f7', accent: '#8b5cf6', preview: ['#ec4899', '#a855f7', '#8b5cf6'] },
]

export default function Settings() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Pull from global context ──────────────────────────────────────────────
  const { settings, updateSettings, saveSettings, resetSettings } = useSettings()

  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'org' | 'theme' | 'appearance' | 'account'>('org')
  const [logoPreview, setLogoPreview] = useState<string>(settings.logoUrl || '/logo.png')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)

  useEffect(() => {
    setLogoPreview(settings.logoUrl || '/logo.png')
  }, [settings.logoUrl])

  useEffect(() => {
    getMyRole().then(role => {
      if (!['admin', 'super_admin'].includes(role)) {
        navigate('/employee-dashboard', { replace: true })
      }
    })

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User'
        setUser({ name, email: data.user.email || '' })
        updateSettings({
          adminEmail: data.user.email || '',
          adminName: settings.adminName || name,
        })
      } else {
        navigate('/login')
      }
    })

    const handle = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.user-menu-wrapper')) setShowUserMenu(false)
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleThemeSelect = (theme: typeof THEMES[0]) => {
    if (theme.id === 'custom') { updateSettings({ theme: 'custom' }); return }
    updateSettings({
      theme: theme.id as OrgSettings['theme'],
      primaryColor:   theme.primary,
      secondaryColor: theme.secondary,
      accentColor:    theme.accent,
    })
  }

  const handleColorChange = (key: keyof OrgSettings, value: string) => {
    updateSettings({ [key]: value, theme: 'custom' })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target?.result as string
      setLogoPreview(url)
      updateSettings({ logoUrl: url })
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    saveSettings()          // persists to localStorage + re-applies CSS vars
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleReset = () => {
    resetSettings()
    setLogoPreview('/logo.png')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const tabs = [
    { id: 'org',        label: 'Organization', icon: <Building2 size={16} /> },
    { id: 'theme',      label: 'Theme',        icon: <Palette size={16} /> },
    { id: 'appearance', label: 'Appearance',   icon: <Image size={16} /> },
    { id: 'account',    label: 'Account',      icon: <User size={16} /> },
  ] as const

  return (
    <div className="dash-wrapper">
      <div className="dash-bg">
        <div className="dash-blob dash-blob-1" /><div className="dash-blob dash-blob-2" /><div className="dash-blob dash-blob-3" />
        <div className="dash-grid" />
      </div>

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main */}
      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="dash-topbar-title">Settings ⚙️</h1>
            <p className="dash-topbar-sub">Customize your organization & appearance</p>
          </div>
          <div className="dash-topbar-right">
            <button className="dash-icon-btn"><Bell size={18} /><span className="dash-notif-dot" /></button>
            <div className="user-menu-wrapper">
              <button className="dash-profile-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                <div className="dash-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                <span className="dash-profile-name">{user?.name}</span>
              </button>
              {showUserMenu && (
                <div className="dash-dropdown">
                  <a href="#" className="dash-drop-item"><User size={15} />Profile</a>
                  <a href="#" className="dash-drop-item"><SettingsIcon size={15} />Settings</a>
                  <hr className="dash-drop-hr" />
                  <button className="dash-drop-item dash-drop-logout" onClick={handleLogout}><LogOut size={15} />Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="dash-content">
          {/* Tabs */}
          <div className="sett-tabs">
            {tabs.map(tab => (
              <button key={tab.id} className={`sett-tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── Organization Tab ── */}
          {activeTab === 'org' && (
            <div className="sett-grid">
              <div className="dash-card sett-card">
                <h3 className="sett-section-title"><Image size={16} /> Organization Logo</h3>
                <div className="sett-logo-section">
                  <div className="sett-logo-preview-wrap">
                    <img src={logoPreview} alt="Logo Preview" className="sett-logo-preview"
                      onError={e => { e.currentTarget.src = ''; e.currentTarget.style.display = 'none' }} />
                    <div className="sett-logo-glow" />
                  </div>
                  <div className="sett-logo-actions">
                    <p className="sett-logo-hint">PNG, JPG or SVG. Recommended 128×128px.</p>
                    <button className="sett-upload-btn" onClick={() => fileInputRef.current?.click()}>
                      <Image size={14} /> Upload Logo
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                    <div className="sett-field" style={{ marginTop: '12px' }}>
                      <label>Or paste image URL</label>
                      <input type="text" value={settings.logoUrl}
                        onChange={e => { updateSettings({ logoUrl: e.target.value }); setLogoPreview(e.target.value) }}
                        placeholder="https://yoursite.com/logo.png" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="dash-card sett-card">
                <h3 className="sett-section-title"><Building2 size={16} /> Organization Info</h3>
                <div className="sett-fields">
                  <div className="sett-field">
                    <label>Organization Name</label>
                    <input type="text" value={settings.orgName}
                      onChange={e => updateSettings({ orgName: e.target.value })} placeholder="e.g. CliCLTake" />
                    <span className="sett-hint">Shown in sidebar and browser tab</span>
                  </div>
                  <div className="sett-field">
                    <label>Tagline / Sub-title</label>
                    <input type="text" value={settings.orgTagline}
                      onChange={e => updateSettings({ orgTagline: e.target.value })} placeholder="e.g. Admin Panel" />
                    <span className="sett-hint">Small text shown below org name</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Theme Tab ── */}
          {activeTab === 'theme' && (
            <div className="sett-grid">
              <div className="dash-card sett-card sett-card-full">
                <h3 className="sett-section-title"><Palette size={16} /> Color Themes</h3>
                <div className="sett-themes-grid">
                  {THEMES.map(theme => (
                    <button key={theme.id} className={`sett-theme-card${settings.theme === theme.id ? ' selected' : ''}`} onClick={() => handleThemeSelect(theme)}>
                      <div className="sett-theme-swatches">
                        {theme.preview.map((color, i) => <div key={i} className="sett-swatch" style={{ background: color }} />)}
                      </div>
                      <span className="sett-theme-name">{theme.name}</span>
                      {settings.theme === theme.id && <span className="sett-theme-check"><Check size={12} /></span>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dash-card sett-card sett-card-full">
                <h3 className="sett-section-title"><Palette size={16} /> Custom Colors</h3>
                <p className="sett-desc">Pick exact colors for full control. Selecting a preset above will auto-fill these.</p>
                <div className="sett-color-row">
                  {[
                    { label: 'Primary Color',   key: 'primaryColor'   as keyof OrgSettings },
                    { label: 'Secondary Color', key: 'secondaryColor' as keyof OrgSettings },
                    { label: 'Accent Color',    key: 'accentColor'    as keyof OrgSettings },
                  ].map(c => (
                    <div className="sett-color-field" key={c.key}>
                      <label>{c.label}</label>
                      <div className="sett-color-pick">
                        <input type="color" value={settings[c.key] as string} onChange={e => handleColorChange(c.key, e.target.value)} />
                        <input type="text"  value={settings[c.key] as string} onChange={e => handleColorChange(c.key, e.target.value)} placeholder="#ec4899" />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Live Preview */}
                <div className="sett-preview-bar">
                  <p className="sett-preview-label">Live Preview</p>
                  <div className="sett-preview-items">
                    <button className="sett-prev-btn" style={{ background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})` }}>Primary Button</button>
                    <span className="sett-prev-badge" style={{ background: `${settings.primaryColor}22`, color: settings.primaryColor, border: `1px solid ${settings.primaryColor}44` }}>Badge</span>
                    <div className="sett-prev-bar-wrap">
                      <div className="sett-prev-bar" style={{ background: `linear-gradient(90deg, ${settings.primaryColor}, ${settings.accentColor})` }} />
                    </div>
                    <span className="sett-prev-link" style={{ color: settings.secondaryColor }}>Link text</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Appearance Tab ── */}
          {activeTab === 'appearance' && (
            <div className="sett-grid">
              <div className="dash-card sett-card sett-card-full">
                <h3 className="sett-section-title"><Image size={16} /> Appearance Options</h3>
                <div className="sett-toggles">
                  {[
                    { key: 'sidebarDark' as keyof OrgSettings, label: 'Dark Sidebar', desc: 'Use dark background for the sidebar navigation' },
                    { key: 'compactMode' as keyof OrgSettings, label: 'Compact Mode', desc: 'Reduce spacing for a denser layout' },
                  ].map(t => (
                    <div className="sett-toggle-item" key={t.key}>
                      <div><p className="sett-toggle-label">{t.label}</p><p className="sett-toggle-desc">{t.desc}</p></div>
                      <button className={`sett-toggle${settings[t.key] ? ' on' : ''}`} onClick={() => updateSettings({ [t.key]: !settings[t.key] })}>
                        <span className="sett-toggle-thumb" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="sett-font-preview">
                  <p className="sett-preview-label">Typography Preview</p>
                  <div className="sett-font-demo" style={{ '--demo-primary': settings.primaryColor } as React.CSSProperties}>
                    <h1 style={{ color: settings.primaryColor }}>Heading One</h1>
                    <h2>Heading Two</h2>
                    <p>Body text — The quick brown fox jumps over the lazy dog.</p>
                    <a href="#" style={{ color: settings.secondaryColor }}>Hyperlink text</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Account Tab ── */}
          {activeTab === 'account' && (
            <div className="sett-grid">
              <div className="dash-card sett-card sett-card-full">
                <h3 className="sett-section-title"><User size={16} /> Admin Account</h3>
                <div className="sett-fields">
                  <div className="sett-field">
                    <label>Display Name</label>
                    <input type="text" value={settings.adminName} onChange={e => updateSettings({ adminName: e.target.value })} placeholder="Your name" />
                  </div>
                  <div className="sett-field">
                    <label>Email Address</label>
                    <input type="email" value={settings.adminEmail} disabled placeholder="your@email.com" />
                    <span className="sett-hint">Email cannot be changed here</span>
                  </div>
                </div>
                <div className="sett-danger-zone">
                  <h4>Danger Zone</h4>
                  <button className="sett-danger-btn" onClick={handleLogout}><LogOut size={15} /> Sign Out of All Devices</button>
                </div>
              </div>
            </div>
          )}

          {/* Save / Reset Bar */}
          <div className="sett-action-bar">
            <button className="sett-reset-btn" onClick={handleReset}><RotateCcw size={15} /> Reset to Default</button>
            <button className={`sett-save-btn${saved ? ' saved' : ''}`} onClick={handleSave}>
              {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Changes</>}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}


