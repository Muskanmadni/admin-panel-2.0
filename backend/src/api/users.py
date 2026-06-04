from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from src.api import deps
from src.models import User, Employee

router = APIRouter()

class UserResponse(BaseModel):
    id: UUID
    supabase_user_id: Optional[UUID]
    email: str
    full_name: Optional[str]
    user_type: str
    role: str
    is_active: bool
    # Profile details
    organization_name: Optional[str] = None
    subdomain: Optional[str] = None
    org_code: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UnifiedRegister(BaseModel):
    user_id: UUID
    email: str
    full_name: Optional[str] = None
    user_type: str = "employee"
    role: str = "employee"
    department: Optional[str] = None
    position: Optional[str] = None
    face_photo_urls: Optional[Any] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None

@router.post("/register", response_model=UserResponse)
def register_user(
    user_data: UnifiedRegister,
    db: Session = Depends(deps.get_db)
):
    """Register a new employee user synced from Supabase."""
    # Check if user already exists in our Neon DB
    existing_user = db.query(User).filter(User.supabase_user_id == user_data.user_id).first()
    if existing_user:
        # Update employee profile with signup data if it exists
        if user_data.user_type == 'employee':
            emp = db.query(Employee).filter(Employee.user_id == existing_user.id).first()
            if emp:
                emp.department = user_data.department or emp.department
                emp.role = user_data.position or user_data.role or emp.role
                if user_data.face_photo_urls:
                    emp.face_photo_urls = user_data.face_photo_urls
                db.commit()
                db.refresh(existing_user)
        return existing_user

    try:
        # 1. Create the main User record (All users go here)
        user = User(
            supabase_user_id=user_data.user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            user_type=user_data.user_type,
            role=user_data.role,
            is_active=True
        )
        db.add(user)
        db.flush() # Get user.id

        if user_data.user_type != 'employee':
            raise HTTPException(status_code=400, detail="Invalid user_type. Only 'employee' is supported.")

        employee_profile = Employee(
            user_id=user.id,
            department=user_data.department,
            role=user_data.position or user_data.role,
            face_photo_urls=user_data.face_photo_urls,
        )
        db.add(employee_profile)

        db.commit()
        db.refresh(user)
        return user

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        import logging
        logging.getLogger(__name__).error(f"Register error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Database sync failed: {str(e)}")

@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db)
):
    """Get current user info with their profile details."""
    response_data = {
        "id": current_user.id,
        "supabase_user_id": current_user.supabase_user_id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "user_type": current_user.user_type,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
    }

    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
    if emp:
        response_data.update({
            "department": emp.department,
            "position": emp.role,
        })
    if current_user.tenant_id:
        from src.models import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
        if tenant:
            response_data.update({
                "organization_name": tenant.name,
                "subdomain": tenant.slug,
                "org_code": tenant.org_code,
            })

    return response_data

@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user)
):
    """Get all users (restricted for non-admins)."""
    users = db.query(User).offset(skip).limit(limit).all()
    result = []
    for u in users:
        data = {
            "id": u.id,
            "supabase_user_id": u.supabase_user_id,
            "email": u.email,
            "full_name": u.full_name,
            "user_type": u.user_type,
            "role": u.role,
            "is_active": u.is_active,
        }
        if u.user_type == "employee":
            emp = db.query(Employee).filter(Employee.user_id == u.id).first()
            if emp:
                data["position"] = emp.role
                data["department"] = emp.department
        result.append(UserResponse(**data))
    return result
