import { useState, useCallback } from "react";
import { Role, AuditLog, TempAccess } from "./types";
import { DEFAULT_ROLES, INITIAL_AUDIT, INITIAL_TEMP } from "./service";

export function useRBAC() {
  const[roles, setRoles] = useState<Role[]>(DEFAULT_ROLES);
  const [audit] = useState<AuditLog[]>(INITIAL_AUDIT);
  const [tempAccess, setTempAccess] = useState<TempAccess[]>(INITIAL_TEMP);

  const togglePerm = useCallback((role: Role, perm: string) => {
    setRoles(prev => prev.map(r => r.id === role.id
      ? { ...r, permissions: r.permissions.includes(perm) ? r.permissions.filter(p=>p!==perm) : [...r.permissions, perm] }
      : r
    ));
  },[]);

  const addRole = (role: Role) => setRoles(p => [...p, role]);
  const deleteRole = (id: string) => setRoles(p => p.filter(r => r.id !== id));
  const addTempAccess = (access: TempAccess) => setTempAccess(p => [...p, access]);
  const revokeTempAccess = (id: string) => setTempAccess(p => p.filter(x => x.id !== id));

  return { roles, audit, tempAccess, togglePerm, addRole, deleteRole, addTempAccess, revokeTempAccess, setRoles, setTempAccess };
}