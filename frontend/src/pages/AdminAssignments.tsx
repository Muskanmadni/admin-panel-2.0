import React, { useState, useEffect } from 'react'
import { Briefcase, User, Search, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { api } from '../lib/api'
import BackButton from '../components/BackButton'
import { useSettings } from '../lib/SettingsContext'

interface Assignment {
  id: string
  employee_id: string
  project_id: string
  assigned_by: string
  status: string
  created_at: string
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
  const [statusFilter, setStatusFilter] = useState('all')

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
    rejected: assignments.filter(a => a.status === 'rejected').length,
    completed: assignments.filter(a => a.status === 'completed').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <BackButton />
        <Briefcase size={22} color="#7c3aed" />
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Project Assignments</h1>
        <span style={{ marginLeft: 'auto', background: '#7c3aed22', color: '#a78bfa', padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.8rem' }}>
          {counts.all} total
        </span>
      </div>

      <div style={{ padding: '1.5rem 2rem' }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {(['all', 'assigned', 'rejected', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: statusFilter === s ? '#7c3aed' : '#1e293b',
                color: statusFilter === s ? '#fff' : '#94a3b8',
                fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {s === 'assigned' && <Clock size={14} />}
              {s === 'rejected' && <XCircle size={14} />}
              {s === 'completed' && <CheckCircle size={14} />}
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by project, employee, role..."
            style={{
              width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem',
              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              color: '#f1f5f9', fontSize: '0.9rem', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <p style={{ color: '#64748b' }}>Loading assignments...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#64748b' }}>No assignments found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8' }}>
                  {['Project', 'Employee', 'Role', 'Priority', 'Progress', 'Status', 'Assigned On', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={a.id}
                    style={{ background: i % 2 === 0 ? '#0f172a' : '#111827', borderBottom: '1px solid #1e293b' }}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{a.project_name}</div>
                      {a.project_end_date && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Due: {a.project_end_date}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} color="#94a3b8" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{a.employee_name || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.employee_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{a.employee_role || '—'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: priorityColor[a.project_priority] + '22', color: priorityColor[a.project_priority], padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                        {a.project_priority.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#334155', borderRadius: 3, minWidth: 60 }}>
                          <div style={{ width: `${a.project_progress}%`, height: '100%', background: '#7c3aed', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{a.project_progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ background: (statusColor[a.status] || '#6b7280') + '22', color: statusColor[a.status] || '#6b7280', padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
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
    </div>
  )
}
