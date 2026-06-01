import React, { useState, useEffect } from 'react'
import { FileText, Search, User, Briefcase, TrendingUp, Inbox, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { api } from '../../lib/api'
import AdminSidebar from '../../components/AdminSidebar'
import '../../styles/adminStyling/Dashboard.css'
import '../../styles/adminStyling/ProjectReport.css'

interface AssignmentReport {
  id: string
  employee_id: string
  project_id: string
  status: string
  created_at: string
  progress_report: string | null
  project_name: string
  project_description: string | null
  project_status: string
  project_priority: string
  project_end_date: string | null
  employee_name: string | null
  employee_email: string | null
  employee_role: string | null
}

type ReportFilter = 'all' | 'submitted' | 'pending'

const priorityColor: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#fbbf24',
  low: '#6b7280',
}

const statusColor: Record<string, string> = {
  assigned: '#3b82f6',
  accepted: '#10b981',
  rejected: '#ef4444',
  completed: '#10b981',
}

function assignmentStatus(a: AssignmentReport): string {
  if (a.project_status === 'completed' || a.status === 'completed') return 'completed'
  return a.status
}

export default function ProjectReport() {
  const [assignments, setAssignments] = useState<AssignmentReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ReportFilter>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    api.get<AssignmentReport[]>('/employee-projects/')
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const withReport = assignments.filter(a => (a.progress_report || '').trim().length > 0)
  const pendingReport = assignments.filter(
    a =>
      !(a.progress_report || '').trim() &&
      assignmentStatus(a) === 'accepted' &&
      a.project_status !== 'completed'
  )

  const filtered = assignments.filter(a => {
    if (filter === 'submitted' && !(a.progress_report || '').trim()) return false
    if (filter === 'pending') {
      if ((a.progress_report || '').trim()) return false
      if (assignmentStatus(a) !== 'accepted' || a.project_status === 'completed') return false
    }
    if (search) {
      const q = search.toLowerCase()
      return (
        a.project_name.toLowerCase().includes(q) ||
        (a.employee_name || '').toLowerCase().includes(q) ||
        (a.employee_email || '').toLowerCase().includes(q) ||
        (a.progress_report || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const displayList =
    filter === 'submitted'
      ? filtered.filter(a => (a.progress_report || '').trim())
      : filtered

  const handleDownloadExcel = () => {
    if (displayList.length === 0) return

    const rows = displayList.map(a => ({
      Project: a.project_name,
      Employee: a.employee_name || '',
      Email: a.employee_email || '',
      Role: a.employee_role || '',
      Priority: a.project_priority,
      Status: assignmentStatus(a),
      'Due Date': a.project_end_date || '',
      'Progress Report': a.progress_report?.trim() || '',
      'Assigned On': new Date(a.created_at).toLocaleDateString(),
    }))

    const sheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Project Reports')

    const date = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `project-reports-${filter}-${date}.xlsx`)
  }

  return (
    <div className="dash-wrapper">
      <AdminSidebar />
      <main className="dash-main project-report-page">
        <div className="project-report-header">
          <FileText size={22} color="#3b82f6" />
          <h1>Project Reports</h1>
          <span className="project-report-count">{withReport.length} shared</span>
        </div>

        <div className="project-report-body">
          <div className="project-report-stats">
            <button
              type="button"
              className={`project-report-stat${filter === 'all' ? ' active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({assignments.length})
            </button>
            <button
              type="button"
              className={`project-report-stat${filter === 'submitted' ? ' active' : ''}`}
              onClick={() => setFilter('submitted')}
            >
              <TrendingUp size={14} />
              Reports shared ({withReport.length})
            </button>
            <button
              type="button"
              className={`project-report-stat${filter === 'pending' ? ' active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              <Inbox size={14} />
              Awaiting report ({pendingReport.length})
            </button>
          </div>

          <div className="project-report-toolbar">
            <div className="project-report-search">
              <Search size={16} className="project-report-search-icon" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search project, employee, or report text..."
              />
            </div>
            <button
              type="button"
              className="project-report-download"
              onClick={handleDownloadExcel}
              disabled={loading || displayList.length === 0}
              title={displayList.length === 0 ? 'No reports to export' : 'Download as Excel'}
            >
              <Download size={16} />
              Download Excel
            </button>
          </div>

          {loading ? (
            <p className="project-report-empty">Loading reports...</p>
          ) : displayList.length === 0 ? (
            <div className="project-report-empty-state">
              <FileText size={40} strokeWidth={1.2} />
              <p>
                {filter === 'submitted'
                  ? 'No progress reports have been shared yet.'
                  : filter === 'pending'
                    ? 'No accepted projects are waiting for a report.'
                    : 'No matching assignments found.'}
              </p>
            </div>
          ) : (
            <div className="project-report-grid">
              {displayList.map(a => {
                const status = assignmentStatus(a)
                const hasReport = !!(a.progress_report || '').trim()
                const expanded = expandedId === a.id

                return (
                  <article key={a.id} className={`project-report-card${hasReport ? ' has-report' : ''}`}>
                    <div className="project-report-card-top">
                      <div className="project-report-card-project">
                        <Briefcase size={16} color="#a855f7" />
                        <div>
                          <h3>{a.project_name}</h3>
                          {a.project_end_date && (
                            <span className="project-report-due">Due {a.project_end_date}</span>
                          )}
                        </div>
                      </div>
                      <div className="project-report-badges">
                        <span
                          className="project-report-badge"
                          style={{
                            background: `${priorityColor[a.project_priority] || '#6b7280'}22`,
                            color: priorityColor[a.project_priority] || '#9d7baa',
                          }}
                        >
                          {a.project_priority}
                        </span>
                        <span
                          className="project-report-badge"
                          style={{
                            background: `${statusColor[status] || '#6b7280'}22`,
                            color: statusColor[status] || '#9d7baa',
                          }}
                        >
                          {status}
                        </span>
                      </div>
                    </div>

                    <div className="project-report-employee">
                      <div className="project-report-avatar">
                        <User size={14} color="#a855f7" />
                      </div>
                      <div>
                        <strong>{a.employee_name || 'Unknown'}</strong>
                        <span>{a.employee_email}</span>
                        {a.employee_role && <em>{a.employee_role}</em>}
                      </div>
                    </div>

                    <div className="project-report-content">
                      {hasReport ? (
                        <>
                          <p className={`project-report-text${expanded ? ' expanded' : ''}`}>
                            {a.progress_report}
                          </p>
                          {(a.progress_report || '').length > 200 && (
                            <button
                              type="button"
                              className="project-report-toggle"
                              onClick={() => setExpandedId(expanded ? null : a.id)}
                            >
                              {expanded ? 'Show less' : 'Read full report'}
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="project-report-missing">
                          No progress report submitted yet.
                        </p>
                      )}
                    </div>

                    <footer className="project-report-card-footer">
                      Assigned {new Date(a.created_at).toLocaleDateString()}
                    </footer>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
