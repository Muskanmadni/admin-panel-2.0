import React, { useState, useEffect, useCallback } from 'react'
import {
  Clock, Users, Download,
  Search, Timer, TrendingUp, AlertCircle,
  DollarSign, Edit
} from 'lucide-react'
import { api } from '../../lib/api'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/adminStyling/TimeTracking.css'

interface TimeLogRow {
  id: string
  project: string
  task: string
  tag: string | null
  start_time: string
  end_time: string
  duration: number
  duration_hours: number
  employee_id: string
  employee_name: string | null
  employee_email: string | null
  employee_department: string | null
}

interface TimeLogStats {
  total_hours_today: number
  total_hours_week: number
  total_logs: number
  active_employees: number
}

const DEPARTMENTS = [
  'All Employees',
  'Developers',
  'Designers',
  'Project Managers',
  'Marketing',
  'Sales',
  'HR',
  'Finance'
]

export default function TimeTracking() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [departmentFilter, setDepartmentFilter] = useState('All Employees')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const [timeLogs, setTimeLogs] = useState<TimeLogRow[]>([])
  const [stats, setStats] = useState({
    totalHoursToday: 0,
    totalHoursWeek: 0,
    totalLogs: 0,
    activeEmployees: 0,
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (dateRange.start) params.set('start_date', dateRange.start)
      if (dateRange.end) params.set('end_date', dateRange.end)
      if (departmentFilter !== 'All Employees') {
        params.set('department', departmentFilter)
      }
      const query = params.toString() ? `?${params.toString()}` : ''

      const [logs, statsData] = await Promise.all([
        api.get<TimeLogRow[]>(`/time-tracking/all${query}`),
        api.get<TimeLogStats>(
          `/time-tracking/stats${departmentFilter !== 'All Employees' ? `?department=${encodeURIComponent(departmentFilter)}` : ''}`
        ),
      ])
      setTimeLogs(logs)
      setStats({
        totalHoursToday: statsData.total_hours_today,
        totalHoursWeek: statsData.total_hours_week,
        totalLogs: statsData.total_logs,
        activeEmployees: statsData.active_employees,
      })
    } catch (err) {
      console.error('Error loading time logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load time tracking data')
      setTimeLogs([])
    } finally {
      setLoading(false)
    }
  }, [departmentFilter, dateRange.start, dateRange.end])

  useEffect(() => {
    loadData()
  }, [loadData])

  const matchesDepartment = (log: TimeLogRow, dept: string) => {
    if (dept === 'All Employees') return true
    const logDept = (log.employee_department || '').toLowerCase()
    return logDept === dept.toLowerCase() || logDept.includes(dept.toLowerCase().replace(/s$/, ''))
  }

  const departmentLogs = timeLogs.filter(log => matchesDepartment(log, departmentFilter))

  const filteredLogs = departmentLogs.filter(log => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      (log.employee_name || '').toLowerCase().includes(q) ||
      (log.employee_email || '').toLowerCase().includes(q) ||
      log.project.toLowerCase().includes(q) ||
      log.task.toLowerCase().includes(q)
    )
  })

  const handleExport = () => {
    const headers = ['Employee', 'Department', 'Project', 'Task', 'Tag', 'Date', 'Hours']
    const rows = filteredLogs.map(log => [
      log.employee_name || 'N/A',
      log.employee_department || 'N/A',
      log.project,
      log.task,
      log.tag || '',
      new Date(log.start_time).toLocaleDateString(),
      log.duration_hours,
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-tracking-${departmentFilter}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getDepartmentIcon = (dept: string) => {
    const icons: Record<string, any> = {
      'All Employees': Users,
      'Developers': Timer,
      'Designers': Edit,
      'Project Managers': TrendingUp,
      'Marketing': DollarSign,
      'Sales': TrendingUp,
      'HR': Users,
      'Finance': DollarSign
    }
    return icons[dept] || Users
  }

  const getDepartmentColor = (dept: string) => {
    const colors: Record<string, string> = {
      'All Employees': '#7c3aed',
      'Developers': '#3b82f6',
      'Designers': '#e91e8c',
      'Project Managers': '#f59e0b',
      'Marketing': '#10b981',
      'Sales': '#06b6d4',
      'HR': '#ef4444',
      'Finance': '#eab308'
    }
    return colors[dept] || '#6b7280'
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="dash-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <AlertCircle size={30} color="#fff" />
        </div>
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button
          onClick={() => loadData()}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Reload Page
        </button>
      </div>
    )
  }

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main">
        <div className="dash-content">
        {/* Header */}
        <div className="page-header">
          <h1>Time Tracking Management</h1>
          <p>Monitor and manage employee work hours across all departments</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-container-horizontal">
          {DEPARTMENTS.map((dept, index) => (
            <div
              key={dept}
              className={`stat-card-horizontal ${departmentFilter === dept ? 'active' : ''}`}
              onClick={() => setDepartmentFilter(dept)}
              style={{
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transform: departmentFilter === dept ? 'translateY(-8px)' : 'translateY(0)',
                boxShadow: departmentFilter === dept
                  ? `0 12px 30px ${getDepartmentColor(dept)}40`
                  : '0 4px 15px rgba(0,0,0,0.1)',
                border: departmentFilter === dept
                  ? `2px solid ${getDepartmentColor(dept)}`
                  : '1px solid #1e2d45',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                
              }}
            >
              {departmentFilter === dept && (
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: `conic-gradient(from 0deg, transparent, ${getDepartmentColor(dept)}20, transparent 30%)`,
                  animation: 'rotate 4s linear infinite',
                  pointerEvents: 'none',
                }} />
              )}
              <div
                className="stat-icon-horizontal"
                style={{
                  background: `linear-gradient(135deg, ${getDepartmentColor(dept)}, ${getDepartmentColor(dept)}80)`,
                  transform: departmentFilter === dept ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                  boxShadow: departmentFilter === dept
                    ? `0 4px 15px ${getDepartmentColor(dept)}50`
                    : 'none',
                }}
              >
                {React.createElement(getDepartmentIcon(dept) as any, { size: 20 })}
              </div>
              <div className="stat-info-horizontal">
                <div className="stat-count-horizontal" style={{
                  background: departmentFilter === dept
                    ? `linear-gradient(135deg, ${getDepartmentColor(dept)}, ${getDepartmentColor(dept)}cc)`
                    : 'none',
                  WebkitBackgroundClip: departmentFilter === dept ? 'text' : 'border-box',
                  WebkitTextFillColor: departmentFilter === dept ? 'transparent' : 'inherit',
                  backgroundClip: departmentFilter === dept ? 'text' : 'border-box',
                }}>
                  {dept === 'All Employees'
                    ? timeLogs.length
                    : timeLogs.filter(l => matchesDepartment(l, dept)).length}
                </div>
                <div className="stat-label-horizontal" style={{
                  fontWeight: departmentFilter === dept ? '700' : '500',
                }}>
                  {dept}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add CSS animations */}
        <style>{`
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {/* Quick Stats */}
        <div className="stats-container-horizontal" style={{ marginTop: '24px' }}>
          <div className="stat-card-horizontal" style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-icon-horizontal" style={{
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
            }}>
              <Clock size={20} />
            </div>
            <div className="stat-info-horizontal">
              <div className="stat-count-horizontal" style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '800',
              }}>{stats.totalHoursToday}h</div>
              <div className="stat-label-horizontal">Today's Hours</div>
            </div>
          </div>
          <div className="stat-card-horizontal" style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-icon-horizontal" style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
            }}>
              <TrendingUp size={20} />
            </div>
            <div className="stat-info-horizontal">
              <div className="stat-count-horizontal" style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '800',
              }}>{stats.totalHoursWeek}h</div>
              <div className="stat-label-horizontal">Week Hours</div>
            </div>
          </div>
          <div className="stat-card-horizontal" style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-icon-horizontal" style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
            }}>
              <AlertCircle size={20} />
            </div>
            <div className="stat-info-horizontal">
              <div className="stat-count-horizontal" style={{
                background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '800',
              }}>{stats.totalLogs}</div>
              <div className="stat-label-horizontal">Total Logs</div>
            </div>
          </div>
          <div className="stat-card-horizontal" style={{
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'
          }}>
            <div className="stat-icon-horizontal" style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
            }}>
              <Timer size={20} />
            </div>
            <div className="stat-info-horizontal">
              <div className="stat-count-horizontal" style={{
                background: 'linear-gradient(135deg, #22c55e, #06b6d4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: '800',
              }}>{stats.activeEmployees}</div>
              <div className="stat-label-horizontal">Employees Tracked</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar" style={{ marginTop: '24px' }}>
          <div className="search-input">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search by employee, project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="filter-select"
            />
          </div>

          <div className="filter-group">
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="filter-select"
            />
          </div>

          <button
            onClick={handleExport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #fce7f3, #dbeafe)',
              border: 'none',
              borderRadius: '8px',
              color: '#831843',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {/* Results Count */}
        <div className="results-count">
          Showing {filteredLogs.length} of {departmentLogs.length} time logs
        </div>

        {/* Time Logs Table */}
        <div className="employees-table-container" style={{
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          borderRadius: '12px',
          overflow: 'hidden',
          }}>
          <table className="employees-table" style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #0a0f1e, #1e2d45)',
              }}>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Employee</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Department</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Project</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Task</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Date</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Hours</th>
                <th style={{
                  padding: '16px',
                  textAlign: 'left',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Tag</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr key={log.id} style={{
                  borderBottom: '1px solid #1e2d45',
                  background: index % 2 === 0 ? '#0a0f1e' : '#0f1425',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1e2d45'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = index % 2 === 0 ? '#0a0f1e' : '#0f1425'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)',
                      }}>
                        {log.employee_name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{log.employee_name || 'N/A'}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>{log.employee_email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      padding: '6px 16px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: `${getDepartmentColor(log.employee_department || '')}20`,
                      color: getDepartmentColor(log.employee_department || ''),
                      border: `1px solid ${getDepartmentColor(log.employee_department || '')}30`,
                    }}>
                      {log.employee_department || 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#fff' }}>{log.project}</td>
                  <td style={{ padding: '16px', color: '#fff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.task}
                  </td>
                  <td style={{ padding: '16px', color: '#fff' }}>{new Date(log.start_time).toLocaleDateString()}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>{log.duration_hours}h</span>
                  </td>
                  <td style={{ padding: '16px', color: '#fff' }}>{log.tag || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredLogs.length === 0 && (
          <div className="empty-state" style={{
            padding: '80px 24px',
            textAlign: 'center',
            }}>
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fce7f3, #f3e8ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Clock size={50} style={{ color: '#ec4899' }} />
            </div>
            <h3 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>No time logs found</h3>
            <p style={{ color: '#fff', opacity: 0.7 }}>Try adjusting your filters or search terms</p>
          </div>
        )}

      </div>
    </main>
  </div>
  )
}
