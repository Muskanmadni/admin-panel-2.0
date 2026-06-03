import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, RefreshCw, Search, Filter, Trash2 } from 'lucide-react'
import { getActivityLogs, clearActivityLogs, ActivityLog } from '../../lib/activity'
import { getMyRole } from './Dashboard'
import AdminSidebar from '../../components/AdminSidebar'
import ActivityFeedList from '../../components/ActivityFeedList'
import '../../styles/adminStyling/Dashboard.css'
import '../../styles/adminStyling/LiveActivity.css'

const SECTIONS = ['All', 'Dashboard', 'Users', 'Leave', 'Announcements', 'Assignments', 'Time Tracking'] as const

export default function LiveActivity() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [sectionFilter, setSectionFilter] = useState<string>('All')
  const [hideSupplemental, setHideSupplemental] = useState(
    () => sessionStorage.getItem('activity_hide_supplemental') === '1'
  )
  const [clearing, setClearing] = useState(false)
  const [canClear, setCanClear] = useState(false)

  const loadLogs = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await getActivityLogs(50, !hideSupplemental)
      setLogs(data)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [hideSupplemental])

  const handleClear = async () => {
    if (
      !confirm(
        'Clear all activity logs? Logged events will be removed. System events from leave, announcements, and other modules can be hidden until you turn them back on.'
      )
    ) {
      return
    }
    setClearing(true)
    try {
      await clearActivityLogs()
      setHideSupplemental(true)
      sessionStorage.setItem('activity_hide_supplemental', '1')
      setSearch('')
      setSectionFilter('All')
      const data = await getActivityLogs(50, false)
      setLogs(data)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clear activity')
    } finally {
      setClearing(false)
    }
  }

  useEffect(() => {
    getMyRole().then(role => {
      if (!['admin', 'super_admin', 'manager'].includes(role)) {
        navigate('/employee-dashboard', { replace: true })
      }
      setCanClear(['admin', 'super_admin'].includes(role))
    })
    loadLogs()
  }, [loadLogs, navigate])

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (sectionFilter !== 'All' && log.section !== sectionFilter) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        log.user_email.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.section.toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q)
      )
    })
  }, [logs, search, sectionFilter])

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = { All: logs.length }
    for (const log of logs) {
      counts[log.section] = (counts[log.section] || 0) + 1
    }
    return counts
  }, [logs])

  return (
    <div className="dash-wrapper">
      <div className="dash-bg">
        <div className="dash-blob dash-blob-1" />
        <div className="dash-blob dash-blob-2" />
        <div className="dash-blob dash-blob-3" />
        <div className="dash-grid" />
      </div>

      <AdminSidebar />

      <main className="dash-main">
        <header className="dash-topbar">
          <div>
            <h1 className="dash-topbar-title">Live Activity</h1>
            <p className="dash-topbar-sub">Real-time feed of actions across your organization</p>
          </div>
          <div className="live-activity-header-actions">
            {hideSupplemental && (
              <button
                type="button"
                className="live-activity-show-system"
                onClick={() => {
                  setHideSupplemental(false)
                  sessionStorage.removeItem('activity_hide_supplemental')
                  loadLogs(true)
                }}
              >
                Show system events
              </button>
            )}
            <button
              type="button"
              className="live-activity-refresh"
              onClick={() => loadLogs(true)}
              disabled={refreshing || clearing}
            >
              <RefreshCw size={16} className={refreshing ? 'live-activity-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            {canClear && (
              <button
                type="button"
                className="live-activity-clear"
                onClick={handleClear}
                disabled={clearing || loading}
              >
                <Trash2 size={16} />
                {clearing ? 'Clearing…' : 'Clear activity'}
              </button>
            )}
          </div>
        </header>

        <div className="dash-content">
          <div className="live-activity-stats">
            <div className="live-activity-stat">
              <Activity size={20} />
              <div>
                <span className="live-activity-stat-value">{logs.length}</span>
                <span className="live-activity-stat-label">Total events</span>
              </div>
            </div>
            <div className="live-activity-stat">
              <Filter size={20} />
              <div>
                <span className="live-activity-stat-value">{filtered.length}</span>
                <span className="live-activity-stat-label">Showing</span>
              </div>
            </div>
          </div>

          <div className="live-activity-toolbar">
            <div className="live-activity-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by user, action, or details…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="live-activity-filters">
              {SECTIONS.map(section => {
                const count = section === 'All' ? logs.length : sectionCounts[section] || 0
                if (section !== 'All' && count === 0) return null
                return (
                  <button
                    key={section}
                    type="button"
                    className={`live-activity-chip${sectionFilter === section ? ' active' : ''}`}
                    onClick={() => setSectionFilter(section)}
                  >
                    {section}
                    {count > 0 && <span className="live-activity-chip-count">{count}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="dash-card live-activity-card">
            <div className="dash-card-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} style={{ color: 'var(--theme-primary)' }} />
                Activity stream
              </h2>
            </div>
            {loading ? (
              <div className="dash-loading" style={{ minHeight: '200px' }}>
                <div className="dash-spinner" />
              </div>
            ) : (
              <ActivityFeedList
                logs={filtered}
                emptyMessage={
                  search || sectionFilter !== 'All'
                    ? 'No activity matches your filters.'
                    : hideSupplemental
                      ? 'Activity log cleared. New actions will appear here.'
                      : 'No activity yet. Actions will appear here as users work in the system.'
                }
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
