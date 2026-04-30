import json
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from src.api import deps
from src.models.models import User, RBACRole, RBACTempAccess

router = APIRouter()

class Permission(BaseModel):
    key: str
    label: str

class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: str
    isSystem: bool
    parentRole: Optional[str] = None
    permissions: List[str]
    createdAt: str
    memberCount: int

class PermissionGroupResponse(BaseModel):
    name: str
    permissions: List[Permission]

class RoleCreate(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: str
    isSystem: bool
    parentRole: Optional[str] = None
    permissions: List[str]
    createdAt: str
    memberCount: int = 0

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    permissions: Optional[List[str]] = None

class TempAccessCreate(BaseModel):
    user_email: str
    role: str
    expires_at: str
    granted_by: Optional[str] = None

class TempAccessResponse(BaseModel):
    id: str
    user: str
    role: str
    expires_at: str
    granted_by: Optional[str]

PERMISSION_GROUPS = {
    "Projects": [
        {"key": "projects.view", "label": "View Projects"},
        {"key": "projects.create", "label": "Create Projects"},
        {"key": "projects.edit", "label": "Edit Projects"},
        {"key": "projects.delete", "label": "Delete Projects"},
        {"key": "projects.assign", "label": "Assign Members"},
    ],
    "Time Tracking": [
        {"key": "time.view", "label": "View Timesheets"},
        {"key": "time.log", "label": "Log Time"},
        {"key": "time.approve", "label": "Approve Timesheets"},
        {"key": "time.export", "label": "Export Reports"},
    ],
    "HRM": [
        {"key": "hrm.view", "label": "View Employees"},
        {"key": "hrm.manage", "label": "Manage Employees"},
        {"key": "hrm.payroll", "label": "Access Payroll"},
        {"key": "hrm.hire", "label": "Hire / Terminate"},
    ],
    "Finance": [
        {"key": "finance.view", "label": "View Financials"},
        {"key": "finance.invoices", "label": "Manage Invoices"},
        {"key": "finance.expenses", "label": "Manage Expenses"},
        {"key": "finance.reports", "label": "Financial Reports"},
    ],
    "AI": [
        {"key": "ai.use", "label": "Use AI Features"},
        {"key": "ai.train", "label": "Train Models"},
        {"key": "ai.manage", "label": "Manage AI Config"},
    ],
    "Settings": [
        {"key": "settings.view", "label": "View Settings"},
        {"key": "settings.manage", "label": "Manage Settings"},
        {"key": "settings.security", "label": "Security Settings"},
    ],
}

DEFAULT_ROLES_DATA = [
    {
        "role_id": "super_admin",
        "name": "Super Admin",
        "description": "Full unrestricted access to all features",
        "color": "#ef4444",
        "is_system": True,
        "permissions": [p["key"] for group in PERMISSION_GROUPS.values() for p in group],
    },
    {
        "role_id": "admin",
        "name": "Admin",
        "description": "Administrative access with some restrictions",
        "color": "#f97316",
        "is_system": True,
        "parent_role": "super_admin",
        "permissions": [p["key"] for group in PERMISSION_GROUPS.values() for p in group if p["key"] != "settings.security"],
    },
    {
        "role_id": "manager",
        "name": "Manager",
        "description": "Team management",
        "color": "#eab308",
        "is_system": True,
        "parent_role": "admin",
        "permissions": ["projects.view", "projects.create", "projects.edit", "hrm.view", "time.view", "time.log", "hrm.manage"],
    },
    {
        "role_id": "editor",
        "name": "Editor",
        "description": "Content editing access",
        "color": "#22c55e",
        "is_system": True,
        "parent_role": "manager",
        "permissions": ["projects.view", "projects.edit", "time.view", "time.log"],
    },
    {
        "role_id": "viewer",
        "name": "Viewer",
        "description": "Read-only access",
        "color": "#6b7280",
        "is_system": True,
        "permissions": ["projects.view", "time.view", "hrm.view"],
    },
    {
        "role_id": "employee",
        "name": "Employee",
        "description": "Standard employee access",
        "color": "#3b82f6",
        "is_system": True,
        "permissions": ["projects.view", "projects.create", "time.view", "time.log"],
    },
]

def init_default_roles(db: Session):
    """Initialize default roles in database if not exists."""
    for role_data in DEFAULT_ROLES_DATA:
        existing = db.query(RBACRole).filter(RBACRole.role_id == role_data["role_id"]).first()
        if not existing:
            role = RBACRole(
                role_id=role_data["role_id"],
                name=role_data["name"],
                description=role_data.get("description"),
                color=role_data.get("color", "#3b82f6"),
                is_system=role_data.get("is_system", False),
                parent_role=role_data.get("parent_role"),
                permissions=json.dumps(role_data.get("permissions", [])),
                member_count=0,
            )
            db.add(role)
    db.commit()

def require_super_admin(current_user: User = Depends(deps.get_current_user)):
    """Only super_admin can perform this action."""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super_admin can perform this action")
    return current_user

def require_admin(current_user: User = Depends(deps.get_current_user)):
    """Super_admin and admin can perform this action."""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only super_admin and admin can perform this action")
    return current_user

@router.post("/init")
def initialize_rbac(db: Session = Depends(deps.get_db)):
    """Initialize default RBAC roles in database."""
    init_default_roles(db)
    return {"message": "RBAC initialized successfully"}

@router.get("/my-role")
def get_my_role(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """Get current user's role and permissions from database."""
    role_db = db.query(RBACRole).filter(RBACRole.role_id == current_user.role).first()
    
    if role_db:
        permissions = json.loads(role_db.permissions) if role_db.permissions else []
    else:
        # Default permissions based on role
        if current_user.role == "super_admin":
            permissions = [p["key"] for group in PERMISSION_GROUPS.values() for p in group]
        elif current_user.role == "admin":
            permissions = [p["key"] for group in PERMISSION_GROUPS.values() for p in group if p["key"] != "settings.security"]
        elif current_user.role == "manager":
            permissions = ["projects.view", "projects.create", "projects.edit", "hrm.view", "time.view", "time.log", "hrm.manage"]
        elif current_user.role == "editor":
            permissions = ["projects.view", "projects.edit", "time.view", "time.log"]
        else:
            permissions = ["projects.view", "time.view"]
    
    return {
        "user_id": str(current_user.id),
        "email": current_user.email,
        "role": current_user.role,
        "permissions": permissions,
        "is_super_admin": current_user.role == "super_admin",
        "is_admin": current_user.role in ["super_admin", "admin"],
    }

@router.get("/roles", response_model=List[RoleResponse])
def get_roles(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """Get all roles. Anyone authenticated can view roles."""
    init_default_roles(db)
    roles = db.query(RBACRole).all()
    return [
        RoleResponse(
            id=r.role_id,
            name=r.name,
            description=r.description,
            color=r.color,
            isSystem=r.is_system,
            parentRole=r.parent_role,
            permissions=json.loads(r.permissions) if r.permissions else [],
            createdAt=r.created_at.isoformat() if r.created_at else "2024-01-01",
            memberCount=r.member_count or 0,
        )
        for r in roles
    ]

@router.post("/roles", response_model=RoleResponse)
def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(deps.get_db)
):
    """Create a new role. Only super_admin can create roles."""
    existing = db.query(RBACRole).filter(RBACRole.role_id == role_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role with this ID already exists")
    
    role = RBACRole(
        role_id=role_data.id,
        name=role_data.name,
        description=role_data.description,
        color=role_data.color,
        is_system=role_data.isSystem,
        parent_role=role_data.parentRole,
        permissions=json.dumps(role_data.permissions),
        member_count=0,
    )
    db.add(role)
    db.commit()
    db.refresh(role)
    
    return RoleResponse(
        id=role.role_id,
        name=role.name,
        description=role.description,
        color=role.color,
        isSystem=role.is_system,
        parentRole=role.parent_role,
        permissions=role_data.permissions,
        createdAt=role.created_at.isoformat() if role.created_at else "2024-01-01",
        memberCount=0,
    )

@router.put("/roles/{role_id}", response_model=RoleResponse)
def update_role(
    role_id: str,
    role_update: RoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(deps.get_db)
):
    """Update a role. Only super_admin and admin can update roles."""
    role = db.query(RBACRole).filter(RBACRole.role_id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role_update.name:
        role.name = role_update.name
    if role_update.description is not None:
        role.description = role_update.description
    if role_update.color:
        role.color = role_update.color
    if role_update.permissions:
        role.permissions = json.dumps(role_update.permissions)
    
    db.commit()
    db.refresh(role)
    
    return RoleResponse(
        id=role.role_id,
        name=role.name,
        description=role.description,
        color=role.color,
        isSystem=role.is_system,
        parentRole=role.parent_role,
        permissions=json.loads(role.permissions) if role.permissions else [],
        createdAt=role.created_at.isoformat() if role.created_at else "2024-01-01",
        memberCount=role.member_count or 0,
    )

@router.delete("/roles/{role_id}")
def delete_role(
    role_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(deps.get_db)
):
    """Delete a role. Only super_admin and admin can delete roles."""
    role = db.query(RBACRole).filter(RBACRole.role_id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    db.delete(role)
    db.commit()
    return {"message": "Role deleted successfully"}

@router.get("/permissions", response_model=List[PermissionGroupResponse])
def get_permission_groups(current_user: User = Depends(require_admin)):
    """Get all permission groups."""
    return [
        {"name": name, "permissions": perms}
        for name, perms in PERMISSION_GROUPS.items()
    ]

@router.get("/temp-access", response_model=List[TempAccessResponse])
def get_temp_access(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """Get all temporary access grants."""
    accesses = db.query(RBACTempAccess).filter(RBACTempAccess.is_active == True).all()
    return [
        TempAccessResponse(
            id=str(a.id),
            user=a.user_email,
            role=a.role,
            expires_at=a.expires_at.isoformat() if a.expires_at else "",
            granted_by=a.granted_by,
        )
        for a in accesses
    ]

@router.post("/temp-access", response_model=TempAccessResponse)
def grant_temp_access(
    access_data: TempAccessCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(deps.get_db)
):
    """Grant temporary access. Only super_admin and admin can access."""
    expires_dt = datetime.fromisoformat(access_data.expires_at.replace("Z", "+00:00")) if access_data.expires_at else datetime.now()
    
    temp_access = RBACTempAccess(
        user_email=access_data.user_email,
        role=access_data.role,
        expires_at=expires_dt,
        granted_by=current_user.full_name or "Admin",
        is_active=True,
    )
    db.add(temp_access)
    db.commit()
    db.refresh(temp_access)
    
    return TempAccessResponse(
        id=str(temp_access.id),
        user=temp_access.user_email,
        role=temp_access.role,
        expires_at=temp_access.expires_at.isoformat() if temp_access.expires_at else "",
        granted_by=temp_access.granted_by,
    )

@router.delete("/temp-access/{access_id}")
def revoke_temp_access(
    access_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(deps.get_db)
):
    """Revoke temporary access. Only super_admin and admin can access."""
    try:
        access_uuid = UUID(access_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid access ID format")
    
    access = db.query(RBACTempAccess).filter(RBACTempAccess.id == access_uuid).first()
    if not access:
        raise HTTPException(status_code=404, detail="Access not found")
    
    access.is_active = False
    db.commit()
    return {"message": "Access revoked successfully"}

@router.get("/stats")
def get_rbac_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(deps.get_db)
):
    """Get RBAC statistics."""
    total_users = db.query(User).filter(User.tenant_id == current_user.tenant_id).count()
    total_roles = db.query(RBACRole).count()
    active_temp = db.query(RBACTempAccess).filter(RBACTempAccess.is_active == True).count()
    
    role_counts = {}
    users = db.query(User).filter(User.tenant_id == current_user.tenant_id).all()
    for user in users:
        role_counts[user.role] = role_counts.get(user.role, 0) + 1
    
    all_perms = [p["key"] for group in PERMISSION_GROUPS.values() for p in group]
    
    return {
        "totalUsers": total_users,
        "totalRoles": total_roles,
        "totalPermissions": len(all_perms),
        "activeTemporaryAccess": active_temp,
        "roleDistribution": role_counts,
    }