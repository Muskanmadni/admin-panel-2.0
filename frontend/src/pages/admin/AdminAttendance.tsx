import React, { useState, useEffect } from 'react'
import { Clock, User, Search } from 'lucide-react'
import { api } from '../../lib/api'
import { formatPktClock, formatPktDate } from '../../lib/pakistanTime'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/adminStyling/Dashboard.css'

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

export default function AdminAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<AttendanceRecord[]>('/attendance/all')
      .then(setRecords).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = records.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (r.employee_name || '').toLowerCase().includes(q) ||
      (r.employee_email || '').toLowerCase().includes(q)
  })

  const uniqueEmployees = new Set(records.map((r) => r.employee_email)).size
  const checkedInToday = records.filter((r) => r.check_in && !r.check_out).length

  const cell: React.CSSProperties = { padding: '0.75rem 1rem' }
  const th: React.CSSProperties = { ...cell, textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main">
        <div style={{ background: 'rgba(15,5,30,0.85)', borderBottom: '1px solid rgba(244,114,182,0.18)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', backdropFilter: 'blur(20px)' }}>
          <Clock size={22} color="#a855f7" />
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Attendance</h1>
          <span style={{ marginLeft: 'auto', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.8rem', border: '1px solid rgba(168,85,247,0.3)' }}>
            {records.length} records
          </span>
        </div>

        <div style={{ padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Records', value: records.length, color: '#a855f7' },
              { label: 'Employees', value: uniqueEmployees, color: '#3b82f6' },
              { label: 'Currently In', value: checkedInToday, color: '#ec4899' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(20,10,40,0.75)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 10, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 160 }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9d7baa' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', maxWidth: 360, marginBottom: '1.5rem' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9d7baa' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee..."
              style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', background: 'rgba(20,10,40,0.75)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 8, color: '#f0e6ff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' } as React.CSSProperties} />
          </div>

          {loading ? <p style={{ color: '#9d7baa' }}>Loading...</p>
            : filtered.length === 0
              ? <p style={{ color: '#9d7baa' }}>{records.length === 0 ? 'No attendance records yet. Employees can check in from Time Tracking.' : 'No results match your search.'}</p>
              : (
                <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(244,114,182,0.18)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(15,5,30,0.85)', color: '#9d7baa' }}>
                        {['Employee', 'Date', 'Check-in (PKT)', 'Check-out (PKT)', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? 'rgba(20,10,40,0.5)' : 'rgba(10,5,20,0.5)', borderBottom: '1px solid rgba(244,114,182,0.08)' }}>
                          <td style={cell}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={14} color="#a855f7" />
                              </div>
                              <div>
                                <div style={{ fontWeight: 500, color: '#f0e6ff' }}>{r.employee_name || '—'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#9d7baa' }}>{r.employee_email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...cell, color: '#9d7baa', whiteSpace: 'nowrap' }}>{formatPktDate(r.date)}</td>
                          <td style={{ ...cell, color: '#22c55e', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPktClock(r.check_in)}</td>
                          <td style={{ ...cell, color: '#f9a8d4', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatPktClock(r.check_out)}</td>
                          <td style={cell}>
                            <span style={{
                              background: r.status === 'present' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
                              color: r.status === 'present' ? '#22c55e' : '#9ca3af',
                              padding: '0.2rem 0.6rem',
                              borderRadius: 12,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}>
                              {r.check_out ? 'completed' : r.check_in ? 'checked in' : r.status}
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
