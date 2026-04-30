// src/lib/RBAC/RBACPage.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PERMISSION_GROUPS, actionColor, rbacApi, DEFAULT_ROLES, INITIAL_AUDIT } from "./service";
import { useRBAC } from "./hooks";
import { Role, AuditLog, TempAccess } from "./types";
import { useSettings } from "../SettingsContext";
import { supabase } from "../supabase";

/* ─────────────────────────────────────────────
   3D Tilt card hook
   Each card independently tracks mouse position
───────────────────────────────────────────── */
function useTilt(strength = 15) {
  const ref = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rect = ref.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;   // -0.5 → 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      ref.current!.style.transform =
        `perspective(600px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg) translateZ(8px)`;
      ref.current!.style.boxShadow =
        `${-x * 18}px ${y * 18}px 40px rgba(0,0,0,0.5), 0 0 24px var(--rbac-glow)`;
    });
  }, [strength]);

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    if (!ref.current) return;
    ref.current.style.transform   = "perspective(600px) rotateY(0deg) rotateX(0deg) translateZ(0px)";
    ref.current.style.boxShadow   = "0 4px 24px rgba(0,0,0,0.3)";
    ref.current.style.transition  = "transform 0.5s cubic-bezier(.23,1,.32,1), box-shadow 0.5s ease";
  }, []);

  const onMouseEnter = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transition = "none";
  }, []);

  return { ref, onMouseMove, onMouseLeave, onMouseEnter };
}

/* ─────────────────────────────────────────────
   Floating particle effect (pure CSS via keyframes
   injected once on mount)
───────────────────────────────────────────── */
function injectParticleStyles() {
  if (document.getElementById("rbac-particle-styles")) return;
  const style = document.createElement("style");
  style.id = "rbac-particle-styles";
  style.textContent = `
    @keyframes rbac-float {
      0%,100% { transform: translateY(0px) rotate(0deg); opacity:0.6; }
      50%      { transform: translateY(-14px) rotate(180deg); opacity:1; }
    }
    @keyframes rbac-pulse-ring {
      0%   { transform: scale(1);   opacity: 0.6; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    @keyframes rbac-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    @keyframes rbac-slide-in {
      from { opacity:0; transform: translateY(16px) scale(0.97); }
      to   { opacity:1; transform: translateY(0)    scale(1);    }
    }
    @keyframes rbac-glow-pulse {
      0%,100% { box-shadow: 0 0 0px var(--rbac-glow); }
      50%     { box-shadow: 0 0 22px var(--rbac-glow); }
    }
    .rbac-card-animate {
      animation: rbac-slide-in 0.45s cubic-bezier(.23,1,.32,1) both;
    }
    .rbac-card-animate:nth-child(1){ animation-delay:0.05s; }
    .rbac-card-animate:nth-child(2){ animation-delay:0.12s; }
    .rbac-card-animate:nth-child(3){ animation-delay:0.19s; }
    .rbac-card-animate:nth-child(4){ animation-delay:0.26s; }
    .rbac-card-animate:nth-child(5){ animation-delay:0.33s; }
    .rbac-card-animate:nth-child(6){ animation-delay:0.40s; }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────
   Role card with 3D tilt
───────────────────────────────────────────── */
function RoleCard({ role, primary, onEdit, onDelete, isSuperAdmin }: {
  role: Role;
  primary: string;
  onEdit: () => void;
  onDelete?: () => void;
  isSuperAdmin: boolean;
}) {
  const tilt = useTilt(14);
  const [hovered, setHovered] = useState(false);

  const canEdit = isSuperAdmin || !role.isSystem;

  return (
    <div
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={() => { tilt.onMouseLeave(); setHovered(false); }}
      onMouseEnter={() => { tilt.onMouseEnter(); setHovered(true);  }}
      className="rbac-card-animate"
      style={{
        background: "linear-gradient(145deg, #0d1526 0%, #111c35 100%)",
        border: `1px solid ${hovered ? role.color + "66" : "#1e2d45"}`,
        borderRadius: 16,
        padding: "22px 20px",
        cursor: "default",
        willChange: "transform",
        position: "relative",
        overflow: "hidden",
        transition: "border-color 0.3s ease",
      }}
    >
      {/* Shimmer overlay on hover */}
      {hovered && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `linear-gradient(105deg, transparent 40%, ${role.color}18 50%, transparent 60%)`,
          backgroundSize: "200% 100%",
          animation: "rbac-shimmer 1.4s infinite linear",
          borderRadius: 16,
        }} />
      )}

      {/* Floating dot accent */}
      <div style={{
        position: "absolute", top: 14, right: 16, width: 7, height: 7,
        borderRadius: "50%", background: role.color,
        animation: hovered ? "rbac-glow-pulse 1.5s infinite" : "rbac-float 3s ease-in-out infinite",
        boxShadow: `0 0 8px ${role.color}`,
      }} />
      {/* Pulse ring */}
      {hovered && (
        <div style={{
          position: "absolute", top: 11, right: 13, width: 13, height: 13,
          borderRadius: "50%", border: `1px solid ${role.color}`,
          animation: "rbac-pulse-ring 1s infinite ease-out",
        }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${role.color}33, ${role.color}11)`,
          border: `1px solid ${role.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
        }}>
          {role.isSystem ? "🔒" : "🛡"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{role.name}</div>
          {role.isSystem && (
            <span style={{
              fontSize: 10, background: `${role.color}22`, color: role.color,
              border: `1px solid ${role.color}44`, borderRadius: 4, padding: "1px 6px",
            }}>SYSTEM{!canEdit ? '' : ' (Editable)'}</span>
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 14px", lineHeight: 1.5 }}>
        {role.description}
      </p>

      {/* Permission count bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginBottom: 5 }}>
          <span>Permissions</span>
          <span style={{ color: role.color }}>{role.permissions.length}</span>
        </div>
        <div style={{ height: 4, background: "#1e2d45", borderRadius: 4, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 4,
            background: `linear-gradient(90deg, ${role.color}, ${role.color}88)`,
            width: `${Math.min(100, (role.permissions.length / 20) * 100)}%`,
            transition: "width 0.6s cubic-bezier(.23,1,.32,1)",
          }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onEdit}
          style={{
            flex: 1, background: `linear-gradient(135deg, ${primary}33, ${primary}11)`,
            color: primary, border: `1px solid ${primary}44`,
            borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 12, fontWeight: 600,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = `${primary}44`; }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = `linear-gradient(135deg, ${primary}33, ${primary}11)`; }}
        >
          {canEdit ? 'Edit Permissions' : 'View Permissions'}
        </button>
        {!role.isSystem && onDelete && (
          <button
            onClick={onDelete}
            style={{
              background: "rgba(239,68,68,0.1)", color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8,
              padding: "8px 12px", cursor: "pointer", fontSize: 12,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.22)"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"; }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toggle switch with 3D depth
───────────────────────────────────────────── */
function Toggle3D({ on, onChange, disabled, primary }: { on: boolean; onChange: () => void; disabled?: boolean; primary: string }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange()}
      disabled={disabled}
      style={{
        width: 42, height: 24, borderRadius: 12,
        background: on
          ? `linear-gradient(135deg, ${primary}, ${primary}cc)`
          : "linear-gradient(135deg, #1e2d45, #162035)",
        border: `1px solid ${on ? primary + "66" : "#2d3f5a"}`,
        position: "relative", cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: on ? `0 0 10px ${primary}55, inset 0 1px 0 rgba(255,255,255,0.1)` : "inset 0 2px 4px rgba(0,0,0,0.4)",
        transition: "all 0.3s cubic-bezier(.23,1,.32,1)",
        flexShrink: 0,
        padding: 0,
        outline: 'none',
      }}
    >
      <div style={{
        position: "absolute", top: 4, left: on ? 22 : 4,
        width: 14, height: 14, borderRadius: "50%",
        background: on ? "#fff" : "#475569",
        boxShadow: on ? "0 2px 6px rgba(0,0,0,0.4), 0 0 4px rgba(255,255,255,0.2)" : "0 2px 4px rgba(0,0,0,0.5)",
        transition: "left 0.3s cubic-bezier(.23,1,.32,1), background 0.3s ease",
      }} />
    </button>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function RBACPage() {
  injectParticleStyles();

  const { settings } = useSettings();
  const primary = settings.primaryColor;
  const secondary = settings.secondaryColor;

  document.documentElement.style.setProperty("--rbac-glow", primary + "55");

  // Use local state - will be populated from API in useEffect
  const [roles, setRoles] = useState<Role[]>([]);
  const [tempAccess, setTempAccess] = useState<TempAccess[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("roles");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showNewRole, setShowNewRole] = useState(false);
  const [showTempModal, setShowTempModal] = useState(false);
  const [search, setSearch] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#3b82f6");
  const [newRoleParent, setNewRoleParent] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<Set<string>>(new Set());
  const [tempUser, setTempUser] = useState("");
  const [tempRole, setTempRole] = useState("viewer");
  const [tempExpiry, setTempExpiry] = useState("");
  const [audit] = useState<AuditLog[]>(INITIAL_AUDIT);

  const isSuperAdmin = currentUserRole === 'super_admin';
  const canManageRBAC = currentUserRole === 'super_admin' || currentUserRole === 'admin';

  // Toggle permission function (local)
  const togglePerm = useCallback((role: Role, perm: string) => {
    setRoles(prev => prev.map(r => r.id === role.id
      ? { ...r, permissions: r.permissions.includes(perm) ? r.permissions.filter(p=>p!==perm) : [...r.permissions, perm] }
      : r
    ));
  }, []);

  // Add/delete role functions
  const addRole = (role: Role) => setRoles(p => [...p, role]);
  const deleteRole = (id: string) => setRoles(p => p.filter(r => r.id !== id));

  // Temp access functions
  const addTempAccess = (access: TempAccess) => setTempAccess(p => [...p, access]);
  const revokeTempAccess = (id: string) => setTempAccess(p => p.filter(x => x.id !== id));

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Initialize RBAC in database
        await rbacApi.init();
        
        // Get actual role from backend API
        let userRole = 'employee';
        try {
          const me = await rbacApi.getCurrentUser();
          userRole = me?.role || 'employee';
          console.log('User role from database:', userRole);
        } catch (err) {
          console.warn('Could not fetch user role from API:', err);
        }
        
        setCurrentUserRole(userRole);
        console.log('RBAC Access level:', userRole);
        
        // Fetch roles from API
        try {
          const fetchedRoles = await rbacApi.getRoles();
          console.log('Fetched roles from API:', fetchedRoles);
          setRoles(fetchedRoles.length > 0 ? fetchedRoles : DEFAULT_ROLES);
        } catch (e) {
          console.error('Failed to fetch roles:', e);
          setRoles(DEFAULT_ROLES);
        }
        
        // Fetch temp access from API
        try {
          const fetchedTemp = await rbacApi.getTempAccess();
          console.log('Fetched temp access from API:', fetchedTemp);
          setTempAccess(fetchedTemp);
        } catch (e) {
          console.error('Failed to fetch temp access:', e);
        }
      } catch (err) {
        console.error('Failed to load RBAC data:', err);
        setRoles(DEFAULT_ROLES);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleTogglePerm = (role: Role, perm: string) => {
    togglePerm(role, perm);
    if (selectedRole?.id === role.id) {
      setSelectedRole(prev => prev ? {
        ...prev,
        permissions: prev.permissions.includes(perm)
          ? prev.permissions.filter(p => p !== perm)
          : [...prev.permissions, perm]
      } : prev);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    const newRole: Role = {
      id: `c${Date.now()}`,
      name: newRoleName,
      description: newRoleDesc,
      color: newRoleColor,
      isSystem: false,
      parentRole: newRoleParent || undefined,
      permissions: Array.from(newRolePerms),
      createdAt: new Date().toISOString().split("T")[0],
      memberCount: 0,
    };
    try {
      await rbacApi.createRole(newRole);
      addRole(newRole);
      setShowNewRole(false);
      setNewRoleName(""); setNewRoleDesc(""); setNewRoleColor("#3b82f6");
      setNewRoleParent(""); setNewRolePerms(new Set());
    } catch (err) {
      console.error('Failed to create role:', err);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await rbacApi.deleteRole(roleId);
      deleteRole(roleId);
    } catch (err) {
      console.error('Failed to delete role:', err);
    }
  };

  const grantTemp = async () => {
    if (!tempUser.trim() || !tempExpiry) return;
    try {
      const access = await rbacApi.grantTempAccess({
        user_email: tempUser,
        role: tempRole,
        expires_at: tempExpiry,
      });
      addTempAccess({
        id: access.id,
        user: tempUser,
        role: tempRole,
        expiresAt: tempExpiry,
        grantedBy: "Admin",
      });
      setShowTempModal(false); setTempUser(""); setTempExpiry(""); setTempRole("viewer");
    } catch (err) {
      console.error('Failed to grant temp access:', err);
    }
  };

  const tabs = [
    { id: "roles",       label: "Roles & Access",     icon: "🛡" },
    { id: "permissions", label: "Permissions Matrix",  icon: "🔑" },
    { id: "temp",        label: "Temporary Access",    icon: "⏳" },
    { id: "audit",       label: "Audit Trail",         icon: "📋" },
  ];

  const inputStyle: React.CSSProperties = {
    background: "#0a1020", border: "1px solid #1e2d45", borderRadius: 8,
    color: "#e2e8f0", padding: "9px 12px", fontSize: 13, outline: "none", width: "100%",
    boxSizing: "border-box",
  };

  const modalOverlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 100,
  };

  const modalBox: React.CSSProperties = {
    background: "linear-gradient(145deg, #0d1526, #111c35)",
    border: "1px solid #1e2d45", borderRadius: 18, padding: 28,
    width: 460, maxHeight: "85vh", overflowY: "auto",
    boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px ${primary}22`,
    animation: "rbac-slide-in 0.3s cubic-bezier(.23,1,.32,1) both",
  };

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: "linear-gradient(135deg, #060c18 0%, #0a0f1e 50%, #060c18 100%)",
      color: "#e2e8f0",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      overflow: "hidden",
    }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 230, minWidth: 230,
        background: "linear-gradient(180deg, #090f1e 0%, #0a1122 100%)",
        borderRight: "1px solid #1e2d4588",
        display: "flex", flexDirection: "column",
        backdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{
          padding: "22px 18px", display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid #1e2d45",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${primary}, ${secondary})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: `0 4px 14px ${primary}55`,
          }}>⬡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{settings.orgName}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>{settings.orgTagline}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
          {tabs.map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedRole(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: activeTab === tab.id
                  ? `linear-gradient(135deg, ${primary}22, ${secondary}11)`
                  : "transparent",
                border: activeTab === tab.id ? `1px solid ${primary}33` : "1px solid transparent",
                color: activeTab === tab.id ? primary : "#64748b",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
                textAlign: "left", transition: "all 0.2s ease",
                boxShadow: activeTab === tab.id ? `0 0 12px ${primary}22` : "none",
              }}>
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              <span style={{ flex: 1 }}>{tab.label}</span>
              {activeTab === tab.id && (
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: primary }} />
              )}
            </button>
          ))}
        </nav>

        {/* Bottom status */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #1e2d45" }}>
          <div style={{ fontSize: 11, color: "#334155" }}>RBAC Access Control</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
            <span style={{ fontSize: 11, color: "#10b981" }}>System Online</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>

        {/* Header */}
        <header style={{
          padding: "22px 28px 16px",
          borderBottom: "1px solid #1e2d4566",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "rgba(6,12,24,0.5)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800,
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569" }}>
              {isSuperAdmin 
                ? "Full control - manage all roles and permissions" 
                : canManageRBAC 
                  ? "Manage team roles and access levels" 
                  : "View roles and permissions (read-only)"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Search */}
            {(activeTab === "roles" && !selectedRole) && (
              <div style={{ position: "relative" }}>
                <input
                  placeholder="Search roles…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...inputStyle, width: 200, paddingLeft: 32 }}
                />
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#475569", fontSize: 13 }}>🔍</span>
              </div>
            )}
            {activeTab === "roles" && !selectedRole && (isSuperAdmin || canManageRBAC) && (
              <button
                onClick={() => setShowNewRole(true)}
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "9px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13,
                  boxShadow: `0 4px 18px ${primary}44`,
                  transition: "all 0.2s ease",
                }}
              >+ New Role</button>
            )}
            {activeTab === "temp" && (
              <button
                onClick={() => setShowTempModal(true)}
                style={{
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "9px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13,
                  boxShadow: `0 4px 18px ${primary}44`,
                }}
              >+ Grant Access</button>
            )}
          </div>
        </header>

        {/* Access Denied for non-admins */}
        {!isSuperAdmin && !canManageRBAC && (
          <div style={{ padding: "24px 28px" }}>
            <div style={{ 
              background: "linear-gradient(145deg, #0d1526, #111c35)", 
              border: "1px solid #ef444433", 
              borderRadius: 12, 
              padding: "24px", 
              textAlign: "center" 
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
              <h3 style={{ color: "#f1f5f9", margin: "0 0 8px" }}>Access Restricted</h3>
              <p style={{ color: "#64748b", margin: 0 }}>
                Your role: <strong style={{ color: primary }}>{currentUserRole}</strong>
                <br /><br />
                Only Super Admins and Admins can manage RBAC settings.
                Contact your administrator for role changes.
              </p>
              <button 
                onClick={() => setCurrentUserRole('admin')}
                style={{
                  marginTop: 16,
                  background: "rgba(239,68,68,0.1)", 
                  color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.2)", 
                  borderRadius: 8,
                  padding: "8px 16px", 
                  cursor: "pointer",
                }}
              >
                Debug: Set as Admin
              </button>
            </div>
          </div>
        )}

        {/* ── ROLES TAB ── */}
        {(activeTab === "roles" && !selectedRole) && (isSuperAdmin || canManageRBAC) && (
          <div style={{ padding: "24px 28px" }}>
            {/* Stats row */}
            <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Roles",   value: roles.length, icon: "🛡", color: primary },
                { label: "System Roles",  value: roles.filter(r => r.isSystem).length, icon: "🔒", color: secondary },
                { label: "Custom Roles",  value: roles.filter(r => !r.isSystem).length, icon: "✏️", color: "#10b981" },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, background: `linear-gradient(145deg, #0d1526, #111c35)`,
                  border: `1px solid ${s.color}22`, borderRadius: 12, padding: "16px 18px",
                  display: "flex", alignItems: "center", gap: 12,
                  animation: `rbac-slide-in 0.4s ${i * 0.08}s both`,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, fontSize: 18,
                    background: `${s.color}18`, border: `1px solid ${s.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Role cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 16 }}>
              {filteredRoles.map(role => (
                <RoleCard
                  key={role.id}
                  role={role}
                  primary={primary}
                  onEdit={() => setSelectedRole(role)}
                  onDelete={() => handleDeleteRole(role.id)}
                  isSuperAdmin={isSuperAdmin}
                />
              ))}
              {filteredRoles.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0", color: "#334155" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <div>No roles match your search</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PERMISSIONS EDITOR ── */}
        {activeTab === "roles" && selectedRole && (isSuperAdmin || canManageRBAC) && (
          <div style={{ padding: "20px 28px" }}>
            <button
              onClick={() => setSelectedRole(null)}
              style={{ background: "none", border: "none", color: primary, cursor: "pointer", marginBottom: 16, fontSize: 13, fontWeight: 600 }}
            >← Back to Roles</button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${selectedRole.color}33, ${selectedRole.color}11)`,
                border: `1px solid ${selectedRole.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>🛡</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selectedRole.name}</h2>
                <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>{selectedRole.permissions.length} permissions active</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <div key={group} style={{
                  background: "linear-gradient(145deg, #0d1526, #111c35)",
                  border: "1px solid #1e2d45", borderRadius: 12, padding: 16,
                  animation: "rbac-slide-in 0.4s both",
                }}>
                  <h3 style={{
                    fontSize: 10, color: "#475569", textTransform: "uppercase",
                    letterSpacing: 1, margin: "0 0 12px", fontWeight: 700,
                  }}>{group}</h3>
                  {perms.map(perm => {
                    const on = selectedRole.permissions.includes(perm.key);
                    return (
                      <div key={perm.key}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 0", cursor: "pointer",
                          transition: "opacity 0.2s",
                        }}>
                        <Toggle3D 
                          on={on} 
                          onChange={() => {
                            console.log('Toggling:', perm.key, 'Current state:', on);
                            handleTogglePerm(selectedRole, perm.key);
                          }} 
                          primary={primary} 
                        />
                        <span 
                          onClick={() => {
                            console.log('Toggling via label:', perm.key);
                            handleTogglePerm(selectedRole, perm.key);
                          }}
                          style={{ fontSize: 12, color: on ? "#cbd5e1" : "#475569", flex: 1, cursor: 'pointer' }}
                        >
                          {perm.label}
                        </span>
                        {on && <span style={{ fontSize: 10, color: primary }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: 24, padding: 16, background: '#1e2d45', borderRadius: 8 }}>
              <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
                <strong>Note:</strong> Changes to system roles affect all users with that role. Use with caution.
              </p>
              <button 
                onClick={async () => {
                  try {
                    await rbacApi.updateRole(selectedRole.id, { permissions: selectedRole.permissions });
                    console.log('✅ Permissions saved to backend');
                    alert('Permissions saved successfully!');
                  } catch (err) {
                    console.error('Failed to save permissions:', err);
                    alert('Failed to save permissions. Check console for details.');
                  }
                }}
                style={{
                  marginTop: 12,
                  background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', cursor: 'pointer', fontWeight: 600,
                }}
              >
                💾 Save Changes
              </button>
            </div>
          </div>
        )}
        
        {/* View only permissions for non-admins */}
        {activeTab === "roles" && selectedRole && !isSuperAdmin && !canManageRBAC && (
          <div style={{ padding: "20px 28px" }}>
            <button
              onClick={() => setSelectedRole(null)}
              style={{ background: "none", border: "none", color: primary, cursor: "pointer", marginBottom: 16, fontSize: 13, fontWeight: 600 }}
            >← Back to Roles</button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${selectedRole.color}33, ${selectedRole.color}11)`,
                border: `1px solid ${selectedRole.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>🛡</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selectedRole.name}</h2>
                <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>{selectedRole.permissions.length} permissions (read-only)</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <div key={group} style={{
                  background: "linear-gradient(145deg, #0d1526, #111c35)",
                  border: "1px solid #1e2d45", borderRadius: 12, padding: 16,
                  animation: "rbac-slide-in 0.4s both",
                }}>
                  <h3 style={{
                    fontSize: 10, color: "#475569", textTransform: "uppercase",
                    letterSpacing: 1, margin: "0 0 12px", fontWeight: 700,
                  }}>{group}</h3>
                  {perms.map(perm => {
                    const on = selectedRole.permissions.includes(perm.key);
                    return (
                      <div key={perm.key}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "7px 0", cursor: "not-allowed",
                          opacity: 0.6,
                        }}>
                        <div style={{
                          width: 42, height: 24, borderRadius: 12,
                          background: on ? `linear-gradient(135deg, ${primary}, ${primary}cc)` : "linear-gradient(135deg, #1e2d45, #162035)",
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", top: 4, left: on ? 22 : 4,
                            width: 14, height: 14, borderRadius: "50%",
                            background: on ? "#fff" : "#475569",
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: on ? "#cbd5e1" : "#475569", flex: 1 }}>{perm.label}</span>
                        {on && <span style={{ fontSize: 10, color: primary }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TEMP ACCESS TAB ── */}
        {activeTab === "temp" && (
          <div style={{ padding: "24px 28px" }}>
            {tempAccess.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                <div>No active temporary access grants</div>
              </div>
            )}
            {tempAccess.map((t, i) => (
              <div key={t.id} style={{
                background: "linear-gradient(145deg, #0d1526, #111c35)",
                border: "1px solid #1e2d45", borderRadius: 12, padding: 18,
                marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center",
                animation: `rbac-slide-in 0.4s ${i * 0.06}s both`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `linear-gradient(135deg, ${primary}33, ${secondary}22)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                  }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.user}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                      Role: <span style={{ color: primary }}>{t.role}</span> · Expires: {t.expiresAt}
                    </div>
                  </div>
                </div>
                <button onClick={() => revokeTempAccess(t.id)} style={{
                  background: "rgba(239,68,68,0.1)", color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8,
                  padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}>Revoke</button>
              </div>
            ))}
          </div>
        )}

        {/* ── AUDIT TAB ── */}
        {activeTab === "audit" && (
          <div style={{ padding: "24px 28px" }}>
            {(!audit || audit.length === 0) ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div>No audit entries yet</div>
              </div>
            ) : audit.map((entry: any, i: number) => (
              <div key={entry.id || i} style={{
                background: "linear-gradient(145deg, #0d1526, #111c35)",
                border: "1px solid #1e2d45", borderRadius: 10, padding: 14,
                marginBottom: 10, display: "flex", gap: 12, alignItems: "flex-start",
                animation: `rbac-slide-in 0.4s ${i * 0.04}s both`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${primary}18`, border: `1px solid ${primary}33`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>📝</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.action || "Action"}</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{entry.user} · {entry.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── NEW ROLE MODAL ── */}
      {showNewRole && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setShowNewRole(false)}>
          <div style={modalBox}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800,
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Create New Role</h2>

            {[
              { label: "Role Name *", value: newRoleName, set: setNewRoleName, placeholder: "e.g. Content Editor" },
              { label: "Description", value: newRoleDesc, set: setNewRoleDesc, placeholder: "Brief description…" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</label>
                <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}

            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Role Color</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)}
                    style={{ width: 44, height: 36, borderRadius: 8, border: "1px solid #1e2d45", background: "none", cursor: "pointer" }} />
                  <input type="text" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Inherits From</label>
                <select value={newRoleParent} onChange={e => setNewRoleParent(e.target.value)}
                  style={{ ...inputStyle }}>
                  <option value="">None</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowNewRole(false)} style={{ flex: 1, background: "#1e2d45", color: "#94a3b8", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={createRole} style={{
                flex: 2,
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                color: "#fff", border: "none", borderRadius: 10, padding: "10px",
                cursor: "pointer", fontWeight: 700, fontSize: 14,
                boxShadow: `0 4px 18px ${primary}44`,
              }}>Create Role</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEMP ACCESS MODAL ── */}
      {showTempModal && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setShowTempModal(false)}>
          <div style={modalBox}>
            <h2 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 800,
              background: `linear-gradient(135deg, ${primary}, ${secondary})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Grant Temporary Access</h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>User Email *</label>
              <input value={tempUser} onChange={e => setTempUser(e.target.value)} placeholder="user@example.com" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Role</label>
                <select value={tempRole} onChange={e => setTempRole(e.target.value)} style={inputStyle}>
                  {roles.map(r => <option key={r.id} value={r.name.toLowerCase()}>{r.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Expires On *</label>
                <input type="date" value={tempExpiry} onChange={e => setTempExpiry(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowTempModal(false)} style={{ flex: 1, background: "#1e2d45", color: "#94a3b8", border: "none", borderRadius: 10, padding: "10px", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={grantTemp} style={{
                flex: 2,
                background: `linear-gradient(135deg, ${primary}, ${secondary})`,
                color: "#fff", border: "none", borderRadius: 10, padding: "10px",
                cursor: "pointer", fontWeight: 700, fontSize: 14,
                boxShadow: `0 4px 18px ${primary}44`,
              }}>Grant Access</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}