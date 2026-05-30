import React from 'react'

interface ProfilePageProps {
  user: any
}

export default function ProfilePage({ user }: ProfilePageProps) {
  return (
    <div className="emp-profile">
      <div className="emp-profile-card">
        <div className="emp-profile-header">
          <div className="emp-profile-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="emp-profile-info">
            <h2>{user?.name}</h2>
            <p>{user?.role}</p>
            <div className={`emp-profile-badge${user?.status === 'Inactive' ? ' inactive' : ''}`}>
              {user?.status || 'Active'}
            </div>
          </div>
        </div>
        <div className="emp-profile-details">
          <div className="emp-detail-row">
            <span className="emp-detail-label">Email</span>
            <span className="emp-detail-value">{user?.email}</span>
          </div>
          <div className="emp-detail-row">
            <span className="emp-detail-label">Department</span>
            <span className="emp-detail-value">{user?.department}</span>
          </div>
          <div className="emp-detail-row">
            <span className="emp-detail-label">Join Date</span>
            <span className="emp-detail-value">
              {user?.joinDate ? new Date(user.joinDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="emp-detail-row">
            <span className="emp-detail-label">Status</span>
            <span className="emp-detail-value">{user?.status}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
