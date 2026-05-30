import React from 'react'
import { Plus, Calendar } from 'lucide-react'

interface LeavePageProps {
  leaveRequests: any[]
  onNewLeave: () => void
}

export default function LeavePage({ leaveRequests, onNewLeave }: LeavePageProps) {
  return (
    <div className="emp-leave">
      <div className="emp-leave-header">
        <h2>Leave Management</h2>
        <button className="emp-btn-primary" onClick={onNewLeave}><Plus size={16} /> Apply for Leave</button>
      </div>
      <div className="emp-leave-stats">
        <div className="emp-leave-stat">
          <div className="emp-stat-number">{leaveRequests.filter(r => r.status === 'approved').length}</div>
          <div className="emp-stat-text">Approved</div>
        </div>
        <div className="emp-leave-stat">
          <div className="emp-stat-number">{leaveRequests.filter(r => r.status === 'pending').length}</div>
          <div className="emp-stat-text">Pending</div>
        </div>
        <div className="emp-leave-stat">
          <div className="emp-stat-number">{leaveRequests.reduce((acc, r) => acc + r.days, 0)}</div>
          <div className="emp-stat-text">Total Days</div>
        </div>
      </div>
      {leaveRequests.length === 0 ? (
        <p style={{ color: '#94a3b8', padding: '1rem 0' }}>No leave requests yet.</p>
      ) : (
        <div className="emp-leave-list">
          {leaveRequests.map((request) => (
            <div key={request.id} className="emp-leave-card">
              <div className="emp-leave-header">
                <div className="emp-leave-type">
                  <Calendar size={16} />
                  <span className={`emp-type-badge emp-type-${request.type}`}>
                    {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                  </span>
                </div>
                <span className={`emp-leave-status emp-status-${request.status}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>
              <div className="emp-leave-dates">
                <span>{new Date(request.startDate).toLocaleDateString()}</span>
                <span> - </span>
                <span>{new Date(request.endDate).toLocaleDateString()}</span>
                <span className="emp-days-count">({request.days} days)</span>
              </div>
              <p className="emp-leave-reason">{request.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
