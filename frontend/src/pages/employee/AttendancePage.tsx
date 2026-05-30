import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api'

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export default function AttendancePage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<any[]>('/time-tracking/my')
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: '#94a3b8', padding: '1rem' }}>Loading...</p>

  const totalSecs = logs.reduce((acc, l) => acc + l.duration, 0)
  const today = new Date().toISOString().slice(0, 10)
  const todaySecs = logs
    .filter(l => l.start_time?.slice(0, 10) === today)
    .reduce((acc, l) => acc + l.duration, 0)
  const projects = [...new Set(logs.map(l => l.project))].length

  return (
    <div className="emp-attendance">
      <div className="emp-attendance-header">
        <h2>Attendance</h2>
      </div>

      <div className="emp-attendance-stats">
        <div className="emp-attendance-stat">
          <div className="emp-stat-number">{logs.length}</div>
          <div className="emp-stat-text">Total Entries</div>
        </div>
        <div className="emp-attendance-stat">
          <div className="emp-stat-number">{fmtDuration(todaySecs)}</div>
          <div className="emp-stat-text">Today</div>
        </div>
        <div className="emp-attendance-stat">
          <div className="emp-stat-number">{fmtDuration(totalSecs)}</div>
          <div className="emp-stat-text">Total Logged</div>
        </div>
        <div className="emp-attendance-stat">
          <div className="emp-stat-number">{projects}</div>
          <div className="emp-stat-text">Projects</div>
        </div>
      </div>

      <div className="emp-attendance-table">
        <h3>Time Tracking Records</h3>
        {logs.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '1rem 0' }}>No records yet. Log time in the Time Tracking page.</p>
        ) : (
          <div className="emp-table-wrapper">
            <table>
              <thead>
                <tr><th>Date</th><th>Project</th><th>Task</th><th>Tag</th><th>Start</th><th>End</th><th>Duration</th></tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.start_time).toLocaleDateString()}</td>
                    <td>{log.project}</td>
                    <td>{log.task}</td>
                    <td>{log.tag || '-'}</td>
                    <td>{new Date(log.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{new Date(log.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{fmtDuration(log.duration)}</td>
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
