import React, { useState, useEffect } from 'react'
import { Clock, User, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { api } from '../lib/api'
import AdminSidebar from '../components/AdminSidebar'
import '../styles/Dashboard.css'

interface AttendanceRecord {
  id: string
  date: string
  check_in: string | null
  check_out: string | null
  status: string
  hours: number
  employee_name: string | null
  employee_email: string | null
}

const statusColor: Record<string, string> = {
  present: '#22c55e',
  late: '#eab308',
  absent: '#ef4444',
  'half-day': '#f97316',
}

export default function AdminAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    api.get<AttendanceRecord[]>('/attendance/all')
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = records.filter(r => {
    if (dateFilter && r.date !== dateFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (r.employee_name || '').toLowerCase().includes(q) ||
        (r.employee_email || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const today = new Date().toISOString().split('T')[0]
  const todayRecords = records.filter(r => r.date === today)
  const totalHours = filtered.reduce((sum, r) => sum + r.hours, 0)

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main">
      {/* Header */}
      <div style={{ background: 'rgba(15,5,30,0.85)', borderBottom: '1px solid rgba(244,114,182,0.18)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', backdropFilter: 'blur(20px)' }}>
        <Clock size={22} color="#a855f7" />
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Attendance</h1>
        <span style={{ marginLeft: 'auto', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.8rem', border: '1px solid rgba(168,85,247,0.3)' }}>
          {records.length} records
        </span>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: "Today's Check-ins", value: todayRecords.length, icon: <CheckCircle size={18} />, color: '#22c55e' },
            { label: 'Total Hours (filtered)', value: totalHours.toFixed(1) + 'h', icon: <Clock size={18} />, color: '#a855f7' },
            { label: 'Employees Present Today', value: todayRecords.filter(r => r.status === 'present').length, icon: <User size={18} />, color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(20,10,40,0.75)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 10, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 180 }}>
              <span style={{ color: s.color }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#9d7baa' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9d7baa' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by employee name or email..."
              style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', background: 'rgba(20,10,40,0.75)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 8, color: '#f0e6ff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' } as React.CSSProperties}
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{ padding: '0.6rem 0.75rem', background: 'rgba(20,10,40,0.75)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 8, color: '#f0e6ff', fontSize: '0.9rem', outline: 'none', colorScheme: 'dark' } as React.CSSProperties}
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} style={{ padding: '0.6rem 1rem', background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, color: '#a855f7', cursor: 'pointer', fontSize: '0.85rem' }}>
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p style={{ color: '#9d7baa' }}>Loading attendance...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#9d7baa' }}>No attendance records found.</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(244,114,182,0.18)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,5,30,0.85)', color: '#9d7baa' }}>
                  {['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? 'rgba(20,10,40,0.5)' : 'rgba(10,5,20,0.5)', borderBottom: '1px solid rgba(244,114,182,0.08)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={14} color="#a855f7" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#f0e6ff' }}>{r.employee_name || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9d7baa' }}>{r.employee_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#9d7baa', whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {r.check_in
                        ? <span style={{ color: '#22c55e', fontWeight: 600 }}>{r.check_in}</span>
                        : <span style={{ color: '#9d7baa' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {r.check_out
                        ? <span style={{ color: '#3b82f6', fontWeight: 600 }}>{r.check_out}</span>
                        : <span style={{ color: '#eab308', fontSize: '0.75rem' }}>In progress</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#f0e6ff', fontWeight: 600 }}>
                      {r.hours > 0 ? `${r.hours}h` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: (statusColor[r.status] || '#6b7280') + '22', color: statusColor[r.status] || '#9d7baa', padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
