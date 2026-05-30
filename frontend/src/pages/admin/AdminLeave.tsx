import React, { useState, useEffect } from 'react'
import { Calendar, User, Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/adminStyling/Dashboard.css'

interface LeaveRequest {
  id: string
  employee_id: string
  employee_name: string | null
  employee_email: string | null
  type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  days: number
  created_at: string
}

const statusColor: Record<string, string> = {
  pending: '#eab308',
  approved: '#22c55e',
  rejected: '#ef4444',
}

const typeColor: Record<string, string> = {
  vacation: '#3b82f6',
  sick: '#ef4444',
  personal: '#8b5cf6',
  emergency: '#f97316',
}

export default function AdminLeave() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    api.get<LeaveRequest[]>('/leave/all')
      .then(setLeaves)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!confirm(`${status === 'approved' ? 'Approve' : 'Reject'} this leave request?`)) return
    setActing(id)
    try {
      await api.patch(`/leave/${id}/status?status=${status}`)
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch (err) {
      console.error(err)
      alert('Failed to update status')
    } finally {
      setActing(null)
    }
  }

  const filtered = leaves.filter(l => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (l.employee_name || '').toLowerCase().includes(q) ||
        (l.employee_email || '').toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all: leaves.length,
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  }

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main">
      {/* Header */}
      <div style={{ background: 'rgba(15, 5, 30, 0.85)', borderBottom: '1px solid rgba(244,114,182,0.18)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', backdropFilter: 'blur(20px)' }}>
        <Calendar size={22} color="#a855f7" />
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Leave Requests</h1>
        <span style={{ marginLeft: 'auto', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.8rem', border: '1px solid rgba(168,85,247,0.3)' }}>
          {counts.all} total
        </span>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: statusFilter === s ? '#a855f7' : 'rgba(20,10,40,0.75)',
                color: statusFilter === s ? '#fff' : '#9d7baa',
                fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: 6,
                border: statusFilter === s ? 'none' : '1px solid rgba(244,114,182,0.18)',
              } as React.CSSProperties}
            >
              {s === 'pending' && <Clock size={14} />}
              {s === 'approved' && <CheckCircle size={14} />}
              {s === 'rejected' && <XCircle size={14} />}
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9d7baa' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by employee, type, reason..."
            style={{
              width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
              background: 'rgba(20,10,40,0.75)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 8,
              color: '#f0e6ff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none',
            } as React.CSSProperties}
          />
        </div>

        {/* Table */}
        {loading ? (
          <p style={{ color: '#9d7baa' }}>Loading leave requests...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#9d7baa' }}>No leave requests found.</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(244,114,182,0.18)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,5,30,0.85)', color: '#9d7baa' }}>
                  {['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Applied On', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id} style={{ background: i % 2 === 0 ? 'rgba(20,10,40,0.5)' : 'rgba(10,5,20,0.5)', borderBottom: '1px solid rgba(244,114,182,0.08)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <User size={14} color="#a855f7" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#f0e6ff' }}>{l.employee_name || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9d7baa' }}>{l.employee_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: (typeColor[l.type] || '#6b7280') + '22', color: typeColor[l.type] || '#9d7baa', padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        {l.type}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#9d7baa', whiteSpace: 'nowrap' }}>
                      {l.start_date} → {l.end_date}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#f0e6ff', fontWeight: 600 }}>
                      {l.days}d
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#9d7baa', maxWidth: 200 }}>
                      <span title={l.reason} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.reason}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: (statusColor[l.status] || '#6b7280') + '22', color: statusColor[l.status] || '#9d7baa', padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#9d7baa', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {l.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            disabled={acting === l.id}
                            onClick={() => handleStatus(l.id, 'approved')}
                            style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 6, padding: '4px 10px', color: '#22c55e', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, opacity: acting === l.id ? 0.5 : 1 }}
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button
                            disabled={acting === l.id}
                            onClick={() => handleStatus(l.id, 'rejected')}
                            style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 6, padding: '4px 10px', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, opacity: acting === l.id ? 0.5 : 1 }}
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'rgba(244,114,182,0.2)', fontSize: '0.75rem' }}>—</span>
                      )}
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



