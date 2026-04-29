/**
 * RBAC Management Components (CORRECTED)
 * Ready-to-use React components for managing RBAC in your admin panel
 */

import React, { useState } from 'react';
import { rbacService } from './service';
import {
  useRoleManagement,
  usePermissionGroups,
  useAuditLogs,
  useRBACStats,
  useTemporaryAccess,
  PermissionGroupsDisplay,
} from './hooks';
import { Role, CustomRole } from './types';

// ============ ROLE MANAGEMENT COMPONENT ============
export const RoleManagementPanel: React.FC<{ currentUserId: string }> = ({
  currentUserId,
}) => {
  const { roles, loading, createRole, updateRole, deleteRole } = useRoleManagement();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentRoleId: '',
    permissions: [] as string[],
  });

  const handleCreateRole = () => {
    if (formData.name && formData.permissions.length > 0) {
      createRole(
        formData.name,
        formData.description,
        formData.permissions,
        formData.parentRoleId || undefined
      );
      setFormData({ name: '', description: '', parentRoleId: '', permissions: [] });
      setShowCreateModal(false);
    }
  };

  const handleUpdateRole = () => {
    if (editingRole && editingRole.type === 'custom') {
      updateRole(editingRole.id, {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      }, currentUserId);
      setEditingRole(null);
      setFormData({ name: '', description: '', parentRoleId: '', permissions: [] });
    }
  };

  if (loading) return <div style={{ padding: '16px' }}>Loading roles...</div>;

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Role Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#3b82f6')}
        >
          + Create Role
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {roles.map((role) => (
          <div key={role.id} style={{
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>{role.name}</h3>
                <span style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: role.type === 'predefined' ? '#dbeafe' : '#dcfce7',
                  color: role.type === 'predefined' ? '#1e40af' : '#166534'
                }}>
                  {role.type === 'predefined' ? 'Predefined' : 'Custom'}
                </span>
              </div>
              {role.type === 'custom' && (
                <button
                  onClick={() => {
                    setEditingRole(role);
                    setFormData({
                      name: role.name,
                      description: role.description,
                      parentRoleId: (role as CustomRole).parentRoleId || '',
                      permissions: role.permissions,
                    });
                  }}
                  style={{
                    color: '#3b82f6',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Edit
                </button>
              )}
            </div>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '12px', margin: '0 0 12px 0' }}>
              {role.description}
            </p>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                Permissions: {role.permissions.length}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                {role.permissions.slice(0, 3).map((perm) => (
                  <span key={perm} style={{
                    fontSize: '12px',
                    background: '#f3f4f6',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}>
                    {perm}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    +{role.permissions.length - 3} more
                  </span>
                )}
              </div>
            </div>
            {role.type === 'custom' && (
              <button
                onClick={() => deleteRole(role.id)}
                style={{
                  color: '#ef4444',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingRole) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 50
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Role Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="e.g., Marketing Lead"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  rows={3}
                  placeholder="Describe this role's purpose"
                />
              </div>

              {!editingRole && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    Parent Role (optional - for inheritance)
                  </label>
                  <select
                    value={formData.parentRoleId}
                    onChange={(e) => setFormData({ ...formData, parentRoleId: e.target.value })}
                    style={{
                      width: '100%',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">None (Base role)</option>
                    {roles
                      .filter((r) => r.type === 'predefined')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
                  Permissions
                </label>
                <PermissionGroupsDisplay
                  selectedPermissions={formData.permissions}
                  onPermissionChange={(perms) => setFormData({ ...formData, permissions: perms })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRole(null);
                  setFormData({ name: '', description: '', parentRoleId: '', permissions: [] });
                }}
                style={{
                  flex: 1,
                  background: '#d1d5db',
                  color: '#1f2937',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingRole ? handleUpdateRole : handleCreateRole}
                style={{
                  flex: 1,
                  background: '#3b82f6',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {editingRole ? 'Update' : 'Create'} Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ USER ROLE ASSIGNMENT COMPONENT ============
export const UserRoleAssignment: React.FC<{ userId: string }> = ({ userId }) => {
  const { roles } = useRoleManagement();
  const [selectedRole, setSelectedRole] = useState('');
  const [territory, setTerritory] = useState('');
  const [department, setDepartment] = useState('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [duration, setDuration] = useState('24');

  const territories = ['London', 'New York', 'Tokyo', 'Singapore'];
  const departments = ['Engineering', 'Marketing', 'Sales', 'Finance', 'HR'];

  const handleAssignRole = () => {
    if (selectedRole) {
      const endDate = isTemporary ? new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000) : undefined;

      rbacService.assignUserRole(
        userId,
        selectedRole,
        territory || undefined,
        department || undefined,
        isTemporary,
        endDate,
        'currentUser'
      );

      setSelectedRole('');
      setTerritory('');
      setDepartment('');
      setIsTemporary(false);
      alert('Role assigned successfully');
    }
  };

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', margin: '0 0 24px 0' }}>Assign User Role</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Select a role...</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Territory (optional)
            </label>
            <select
              value={territory}
              onChange={(e) => setTerritory(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All territories</option>
              {territories.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Department (optional)
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="temporary"
            checked={isTemporary}
            onChange={(e) => setIsTemporary(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="temporary" style={{ fontSize: '14px', cursor: 'pointer' }}>
            Temporary Access
          </label>
        </div>

        {isTemporary && (
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Duration (hours)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              max="8760"
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        <button
          onClick={handleAssignRole}
          style={{
            width: '100%',
            background: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Assign Role
        </button>
      </div>
    </div>
  );
};

// ============ AUDIT LOG VIEWER COMPONENT ============
export const AuditLogViewer: React.FC = () => {
  const { logs, loading, exportLogs } = useAuditLogs({ limit: 50 });
  const [filterType, setFilterType] = useState('');

  const filteredLogs = filterType ? logs.filter((log) => log.actionType === filterType) : logs;

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Audit Logs</h2>
        <button
          onClick={() => {
            const data = exportLogs('csv');
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-logs-${new Date().toISOString()}.csv`;
            a.click();
          }}
          style={{
            background: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Export CSV
        </button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '14px'
          }}
        >
          <option value="">All Action Types</option>
          <option value="role_assigned">Role Assigned</option>
          <option value="role_removed">Role Removed</option>
          <option value="permission_granted">Permission Granted</option>
          <option value="permission_revoked">Permission Revoked</option>
          <option value="access_granted">Access Granted</option>
          <option value="access_revoked">Access Revoked</option>
        </select>
      </div>

      {loading ? (
        <div>Loading audit logs...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Timestamp</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Action</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Performed By</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Target</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontSize: '12px' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{log.actionType}</td>
                  <td style={{ padding: '12px' }}>{log.performedBy}</td>
                  <td style={{ padding: '12px', fontSize: '12px' }}>
                    {log.targetUser || log.targetRole || '-'}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                    {log.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============ RBAC STATISTICS DASHBOARD ============
export const RBACStatsDashboard: React.FC = () => {
  const { stats, loading } = useRBACStats();

  if (loading || !stats) return <div style={{ padding: '16px' }}>Loading statistics...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Users</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>{stats.totalUsers}</div>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Roles</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>{stats.totalRoles}</div>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Permissions</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px' }}>{stats.totalPermissions}</div>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Active Temporary Access</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '8px', color: '#ea580c' }}>
          {stats.activeTemporaryAccess}
        </div>
      </div>
    </div>
  );
};

// ============ TEMPORARY ACCESS MANAGEMENT ============
export const TemporaryAccessManager: React.FC<{ userId: string }> = ({ userId }) => {
  const { temporaryAccess, grantAccess, revokeAccess, loading } = useTemporaryAccess(userId);
  const { roles } = useRoleManagement();
  const [selectedRole, setSelectedRole] = useState('');
  const [duration, setDuration] = useState('24');
  const [reason, setReason] = useState('');

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', margin: '0 0 24px 0' }}>
        Temporary Access Management
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          >
            <option value="">Select a role...</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Duration (hours)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              max="8760"
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Audit, Special project"
              style={{
                width: '100%',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (selectedRole) {
              grantAccess(selectedRole, parseInt(duration), reason || undefined);
              setSelectedRole('');
              setDuration('24');
              setReason('');
            }
          }}
          style={{
            width: '100%',
            background: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Grant Temporary Access
        </button>
      </div>

      <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Active Temporary Access</h3>
      {loading ? (
        <div>Loading...</div>
      ) : temporaryAccess.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No active temporary access</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {temporaryAccess.map((access) => (
            <div
              key={access.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid #e5e7eb',
                padding: '12px',
                borderRadius: '6px'
              }}
            >
              <div>
                <div style={{ fontWeight: '600' }}>
                  {rbacService.getRole(access.roleId)?.name}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Expires: {new Date(access.expiresAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => revokeAccess(access.id)}
                style={{
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};