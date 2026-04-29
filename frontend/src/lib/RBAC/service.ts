import { PermissionGroups, Role, AuditLog, TempAccess } from "./types";
import { api } from '../api';

export const PERMISSION_GROUPS: PermissionGroups = {
  Projects:[
    { key: "projects.view", label: "View Projects" },
    { key: "projects.create", label: "Create Projects" },
    { key: "projects.edit", label: "Edit Projects" },
    { key: "projects.delete", label: "Delete Projects" },
    { key: "projects.assign", label: "Assign Members" },
  ],
  "Time Tracking":[
    { key: "time.view", label: "View Timesheets" },
    { key: "time.log", label: "Log Time" },
    { key: "time.approve", label: "Approve Timesheets" },
    { key: "time.export", label: "Export Reports" },
  ],
  "HRM":[
    { key: "hrm.view", label: "View Employees" },
    { key: "hrm.manage", label: "Manage Employees" },
    { key: "hrm.payroll", label: "Access Payroll" },
    { key: "hrm.hire", label: "Hire / Terminate" },
  ],
  Finance:[
    { key: "finance.view", label: "View Financials" },
    { key: "finance.invoices", label: "Manage Invoices" },
    { key: "finance.expenses", label: "Manage Expenses" },
    { key: "finance.reports", label: "Financial Reports" },
  ],
  AI:[
    { key: "ai.use", label: "Use AI Features" },
    { key: "ai.train", label: "Train Models" },
    { key: "ai.manage", label: "Manage AI Config" },
  ],
  Settings:[
    { key: "settings.view", label: "View Settings" },
    { key: "settings.manage", label: "Manage Settings" },
    { key: "settings.security", label: "Security Settings" },
  ],
};

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();

export const DEFAULT_ROLES: Role[] = [
  { id: "super_admin", name: "Super Admin", description: "Full unrestricted access to all features", color: "#ef4444", isSystem: true, permissions: ALL_PERMISSIONS.map(p => p.key), createdAt: "2024-01-01", memberCount: 1 },
  { id: "admin", name: "Admin", description: "Administrative access with some restrictions", color: "#f97316", isSystem: true, parentRole: "super_admin", permissions: ALL_PERMISSIONS.map(p => p.key).filter(k => !["settings.security"].includes(k)), createdAt: "2024-01-01", memberCount: 3 },
  { id: "manager", name: "Manager", description: "Team management", color: "#eab308", isSystem: true, parentRole: "admin", permissions: ["projects.view", "projects.create", "projects.edit", "hrm.view", "time.view", "time.log", "hrm.manage"], createdAt: "2024-01-01", memberCount: 7 },
  { id: "editor", name: "Editor", description: "Content editing access", color: "#22c55e", isSystem: true, permissions: ["projects.view", "projects.edit", "time.view", "time.log"], createdAt: "2024-01-01", memberCount: 0 },
  { id: "viewer", name: "Viewer", description: "Read-only access", color: "#6b7280", isSystem: true, permissions: ["projects.view", "time.view", "hrm.view"], createdAt: "2024-01-01", memberCount: 0 },
  { id: "employee", name: "Employee", description: "Standard employee access", color: "#3b82f6", isSystem: true, permissions: ["projects.view", "projects.create", "time.view", "time.log"], createdAt: "2024-01-01", memberCount: 0 },
];

export const INITIAL_AUDIT: AuditLog[] = [
  { id: "a1", actor: "System", action: "ROLE_CREATED", target: "System", detail: "RBAC initialized", timestamp: new Date().toISOString() }
];

export const INITIAL_TEMP: TempAccess[] = [];

export const actionColor = (a: string) => {
  const colors: Record<string, string> = { PERMISSION_GRANTED: "#22c55e", PERMISSION_REVOKED: "#ef4444", ROLE_CREATED: "#3b82f6", ROLE_EDITED: "#eab308", TEMP_ACCESS_EXPIRED: "#6b7280" };
  return colors[a] ?? "#6b7280";
};

export const rbacApi = {
  async init(): Promise<void> {
    try {
      await api.post('/rbac/init', {});
    } catch {
      console.warn('RBAC init failed (may already be initialized)');
    }
  },

  async getRoles(): Promise<Role[]> {
    try {
      const roles = await api.get<any[]>('/rbac/roles');
      // Normalize the response to match frontend Role type
      return roles.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        color: r.color || '#3b82f6',
        isSystem: r.isSystem || r.is_system || false,
        parentRole: r.parentRole || r.parent_role,
        permissions: r.permissions || [],
        createdAt: r.createdAt || r.created_at || "2024-01-01",
        memberCount: r.memberCount || r.member_count || 0,
      }));
    } catch {
      return DEFAULT_ROLES;
    }
  },

  async createRole(role: Role): Promise<Role> {
    const result = await api.post<any>('/rbac/roles', {
      id: role.id,
      name: role.name,
      description: role.description,
      color: role.color,
      isSystem: role.isSystem,
      parentRole: role.parentRole,
      permissions: role.permissions,
      createdAt: role.createdAt,
      memberCount: 0,
    });
    return result;
  },

  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const result = await api.put<any>(`/rbac/roles/${roleId}`, updates);
    return result;
  },

  async deleteRole(roleId: string): Promise<void> {
    await api.delete(`/rbac/roles/${roleId}`);
  },

  async getPermissions() {
    return await api.get('/rbac/permissions');
  },

  async grantTempAccess(data: { user_email: string; role: string; expires_at: string }): Promise<TempAccess> {
    const result = await api.post<any>('/rbac/temp-access', {
      user_email: data.user_email,
      role: data.role,
      expires_at: data.expires_at,
    });
    return {
      id: result.id,
      user: result.user,
      role: result.role,
      expiresAt: result.expires_at,
      grantedBy: result.granted_by,
    };
  },

  async revokeTempAccess(accessId: string): Promise<void> {
    await api.delete(`/rbac/temp-access/${accessId}`);
  },

  async getTempAccess(): Promise<TempAccess[]> {
    try {
      const accesses = await api.get<any[]>('/rbac/temp-access');
      return accesses.map(a => ({
        id: a.id,
        user: a.user,
        role: a.role,
        expiresAt: a.expires_at,
        grantedBy: a.granted_by,
      }));
    } catch {
      return [];
    }
  },

  async getStats() {
    try {
      return await api.get<any>('/rbac/stats');
    } catch {
      return {
        totalUsers: 0,
        totalRoles: DEFAULT_ROLES.length,
        totalPermissions: ALL_PERMISSIONS.length,
        activeTemporaryAccess: 0,
      };
    }
  },
};