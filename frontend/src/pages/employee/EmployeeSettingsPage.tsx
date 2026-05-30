import React from 'react'

export default function EmployeeSettingsPage() {
  return (
    <div className="emp-settings">
      <h2>Settings</h2>
      <div className="emp-settings-card">
        <h3>Notification Preferences</h3>
        <div className="emp-setting-item">
          <label><input type="checkbox" defaultChecked /> Email notifications for project updates</label>
        </div>
        <div className="emp-setting-item">
          <label><input type="checkbox" defaultChecked /> Daily attendance reminders</label>
        </div>
        <div className="emp-setting-item">
          <label><input type="checkbox" /> Weekly performance reports</label>
        </div>
      </div>
      <div className="emp-settings-card">
        <h3>Account Settings</h3>
        <div className="emp-setting-item">
          <label>Change Password</label>
          <button className="emp-btn-secondary">Update Password</button>
        </div>
        <div className="emp-setting-item">
          <label>Two-Factor Authentication</label>
          <button className="emp-btn-secondary">Enable 2FA</button>
        </div>
      </div>
    </div>
  )
}
