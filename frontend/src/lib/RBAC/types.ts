export interface Permission {
  key: string;
  label: string;
}

export type PermissionGroups = Record<string, Permission[]>;

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
  parentRole?: string;
  permissions: string[];
  createdAt: string;
  memberCount: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  timestamp: string;
}

export interface TempAccess {
  id: string;
  user: string;
  role: string;
  expiresAt: string;
  grantedBy: string;
}