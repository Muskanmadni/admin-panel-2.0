import React, { useState, useEffect } from 'react'
import { Briefcase, User, Search, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '../lib/api'
import AdminSidebar from '../components/AdminSidebar'
import '../styles/Dashboard.css'
import { useSettings } from '../lib/SettingsContext'

interface Assignment {
  id: string
  employee_id: string
  project_id: string
  assigned_by: string
  status: string
  created_at: string
  progress_report: string | null
  project_name: string
  project_description: string | null
  project_status: string
  project_priority: string
  project_progress: number
  project_end_date: string | null
  employee_name: string | null
  employee_email: string | null
  employee_role: string | null
}

const statusColor: Record<string, string> = {
  assigned: '#3b82f6',
  accepted: '#10b981',
  rejected: '#ef4444',
  completed: '#10b981',
}

const priorityColor: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#fbbf24',
  low: '#6b7280',
}

export default function AdminAssignments() {
  const { settings } = useSettings()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigned' | 'accepted' | 'rejected' | 'completed'>('all')

  useEffect(() => {
    api.get<Assignment[]>('/employee-projects/')
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleUnassign = async (id: string) => {
    if (!confirm('Remove this assignment?')) return
    await api.delete(`/employee-projects/${id}`)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  const filtered = assignments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.project_name.toLowerCase().includes(q) ||
        (a.employee_name || '').toLowerCase().includes(q) ||
        (a.employee_email || '').toLowerCase().includes(q) ||
        (a.employee_role || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all: assignments.length,
    assigned: assignments.filter(a => a.status === 'assigned').length,
    accepted: assignments.filter(a => a.status === 'accepted').length,
    rejected: assignments.filter(a => a.status === 'rejected').length,
    completed: assignments.filter(a => a.status === 'completed').length,
  }

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main">
      {/* Header */}
      <div style={{ background: 'rgba(15, 5, 30, 0.85)', borderBottom: '1px solid rgba(244,114,182,0.18)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', backdropFilter: 'blur(20px)' }}>
        <Briefcase size={22} color="#a855f7" />
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Project Assignments</h1>
        <span style={{ marginLeft: 'auto', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.8rem', border: '1px solid rgba(168,85,247,0.3)' }}>
          {counts.all} total
        </span>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['all', 'assigned', 'accepted', 'rejected', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 8, border: statusFilter === s ? 'none' : '1px solid rgba(244,114,182,0.18)', cursor: 'pointer',
                background: statusFilter === s ? '#a855f7' : 'rgba(20,10,40,0.75)',
                color: statusFilter === s ? '#fff' : '#9d7baa',
                fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: 6,
              } as React.CSSProperties}
            >
              {s === 'assigned' && <Clock size={14} />}
              {s === 'accepted' && <CheckCircle size={14} />}
              {s === 'rejected' && <XCircle size={14} />}
              {s === 'completed' && <CheckCircle size={14} />}
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
            placeholder="Search by project, employee, role..."
            style={{
              width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
              background: 'rgba(20,10,40,0.75)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 8,
              color: '#f0e6ff', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none',
            } as React.CSSProperties}
          />
        </div>

        {/* Table */}
        {loading ? (
          <p style={{ color: '#9d7baa' }}>Loading assignments...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#9d7baa' }}>No assignments found.</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(244,114,182,0.18)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(15,5,30,0.85)', color: '#9d7baa' }}>
                  {['Project', 'Employee', 'Role', 'Priority', 'Progress', 'Status', 'Progress Report', 'Assigned On', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ background: i % 2 === 0 ? 'rgba(20,10,40,0.5)' : 'rgba(10,5,20,0.5)', borderBottom: '1px solid rgba(244,114,182,0.08)' }}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#f0e6ff' }}>{a.project_name}</div>
                      {a.project_end_date && <div style={{ fontSize: '0.75rem', color: '#9d7baa' }}>Due: {a.project_end_date}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} color="#a855f7" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: '#f0e6ff' }}>{a.employee_name || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9d7baa' }}>{a.employee_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#9d7baa' }}>{a.employee_role || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: priorityColor[a.project_priority] + '22', color: priorityColor[a.project_priority], padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                        {a.project_priority.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'rgba(168,85,247,0.15)', borderRadius: 3, minWidth: 60 }}>
                          <div style={{ width: `${a.project_progress}%`, height: '100%', background: '#a855f7', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#9d7baa' }}>{a.project_progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: (statusColor[a.status] || '#6b7280') + '22', color: statusColor[a.status] || '#9d7baa', padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', maxWidth: 220 }}>
                      {a.progress_report ? (
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={a.progress_report}>
                          {a.progress_report}
                        </div>
                      ) : (
                        <span style={{ color: '#475569', fontSize: '0.75rem' }}>No report yet</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#9d7baa', fontSize: '0.8rem' }}>
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        onClick={() => handleUnassign(a.id)}
                        title="Remove assignment"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
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
