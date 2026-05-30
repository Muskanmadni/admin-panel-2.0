import React, { useState } from 'react'
import { Calendar, Users, CheckCircle, XCircle, TrendingUp, CheckCircle2 } from 'lucide-react'

interface ProjectsPageProps {
  projects: any[]
  onAccept: (assignmentId: string) => void
  onReject: (assignmentId: string) => void
  onProgressReport: (assignmentId: string, report: string) => void
  onComplete: (assignmentId: string) => void
}

export default function ProjectsPage({ projects, onAccept, onReject, onProgressReport, onComplete }: ProjectsPageProps) {
  const [filter, setFilter] = useState('all')
  const [reportDraft, setReportDraft] = useState<Record<string, string>>({})
  const [expandedReport, setExpandedReport] = useState<string | null>(null)

  const visible = projects.filter((p) => p.assignmentStatus !== 'rejected')
  const filtered = visible.filter((p) => filter === 'all' || p.status === filter)

  return (
    <div className="emp-projects">
      <div className="emp-section-header">
        <h2>My Projects</h2>
        <div className="emp-project-filters">
          {['all', 'active', 'completed'].map(f => (
            <button
              key={f}
              className={`emp-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '1rem 0' }}>No projects found.</p>
      ) : (
        <div className="emp-projects-grid">
          {filtered.map((project: any) => (
            <div key={project.id} className={`emp-project-card emp-project-${project.status}`}>
              <div className="emp-project-header">
                <h3>{project.name}</h3>
                <span className={`emp-project-status emp-status-${project.status}`}>{project.status}</span>
              </div>
              <p className="emp-project-desc">{project.description}</p>
              <div className="emp-project-meta">
                <div className="emp-project-deadline">
                  <Calendar size={14} />
                  <span>{project.deadline}</span>
                </div>
                <div className={`emp-project-priority emp-priority-${project.priority}`}>{project.priority}</div>
              </div>
              {project.team.length > 0 && (
                <div className="emp-project-team">
                  <Users size={14} />
                  <span>{project.team.join(', ')}</span>
                </div>
              )}

              {project.status === 'completed' ? (
                <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#a855f7', fontSize: '0.8rem', fontWeight: 600 }}>
                  ✓ Project Completed
                </div>
              ) : project.assignmentStatus === 'accepted' ? (
                <div style={{ marginTop: '0.75rem', textAlign: 'center', color: '#34d399', fontSize: '0.8rem', fontWeight: 600 }}>
                  ✓ Assignment Accepted
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => onAccept(project.assignmentId)}
                    style={{
                      flex: 1, padding: '0.4rem 0',
                      background: '#10b98122', color: '#34d399', border: '1px solid #10b98144',
                      borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <CheckCircle size={14} /> Accept
                  </button>
                  <button
                    onClick={() => onReject(project.assignmentId)}
                    style={{
                      flex: 1, padding: '0.4rem 0',
                      background: '#ef444422', color: '#f87171', border: '1px solid #ef444444',
                      borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}

              {project.status !== 'completed' && project.assignmentStatus === 'accepted' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    onClick={() => {
                      if (!confirm(`Mark "${project.name}" as complete?`)) return
                      onComplete(project.assignmentId)
                    }}
                    style={{
                      width: '100%', padding: '0.4rem 0',
                      background: '#a855f722', color: '#d8b4fe', border: '1px solid #a855f744',
                      borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    Mark Project Complete
                  </button>
                </div>
              )}

              {project.status !== 'completed' && (
              <div style={{ marginTop: '0.75rem' }}>
                  <button
                    onClick={() => setExpandedReport(expandedReport === project.assignmentId ? null : project.assignmentId)}
                    style={{
                      width: '100%', padding: '0.4rem 0',
                      background: '#3b82f622', color: '#93c5fd', border: '1px solid #3b82f644',
                      borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <TrendingUp size={14} />
                    {project.progressReport ? 'Update Progress Report' : 'Write Progress Report'}
                  </button>
                  {expandedReport === project.assignmentId && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {project.progressReport && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', padding: '0.5rem', background: '#0f172a', borderRadius: 4 }}>
                          <strong style={{ color: '#64748b' }}>Last report:</strong> {project.progressReport}
                        </div>
                      )}
                      <textarea
                        rows={3}
                        placeholder="Describe your progress, what you've completed, and what's remaining..."
                        value={reportDraft[project.assignmentId] ?? project.progressReport ?? ''}
                        onChange={e => setReportDraft(prev => ({ ...prev, [project.assignmentId]: e.target.value }))}
                        style={{
                          width: '100%', padding: '0.5rem', background: '#1e293b',
                          border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0',
                          fontSize: '0.8rem', resize: 'vertical', boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() => {
                          const text = reportDraft[project.assignmentId] ?? ''
                          if (!text.trim()) return
                          onProgressReport(project.assignmentId, text)
                          setExpandedReport(null)
                        }}
                        style={{
                          marginTop: '0.4rem', width: '100%', padding: '0.4rem 0',
                          background: '#3b82f6', color: '#fff', border: 'none',
                          borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        Submit Report
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
