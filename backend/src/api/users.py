from typing import List, Optional, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from src.api import deps
from src.models import User, Tenant, IndividualUser, Employee

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

    model_config = ConfigDict(from_attributes=True)

class UnifiedRegister(BaseModel):
    user_id: UUID  # Supabase User ID
    email: str
    full_name: Optional[str] = None
    user_type: str  # 'individual' or 'employee'
    role: str = "employee"
    # Employee specific
    org_code: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    # Individual specific
    phone_number: Optional[str] = None
    address: Optional[str] = None

@router.post("/register", response_model=UserResponse)
def register_user(
    user_data: UnifiedRegister,
    db: Session = Depends(deps.get_db)
):
    """Register a new user (Individual or Organizational) synced from Supabase."""
    # Check if user already exists in our Neon DB
    existing_user = db.query(User).filter(User.supabase_user_id == user_data.user_id).first()
    if existing_user:
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

        if user_data.user_type == 'employee':
            # Handle Employee User - lookup tenant by org_code
            if not user_data.org_code:
                raise HTTPException(status_code=400, detail="Organization code is required for employee type")
            
            tenant = db.query(Tenant).filter(Tenant.org_code == user_data.org_code).first()
            if not tenant:
                raise HTTPException(status_code=404, detail="Organization not found. Check your organization code.")
            
            employee_profile = Employee(
                user_id=user.id,
                department=user_data.department,
                role=user_data.position or user_data.role
            )
            db.add(employee_profile)

            # Link user to tenant
            user.tenant_id = tenant.id
        
        elif user_data.user_type == 'individual':
            # 2b. Handle Individual User
            ind_profile = IndividualUser(
                user_id=user.id,
                phone_number=user_data.phone_number,
                address=user_data.address
            )
            db.add(ind_profile)
        else:
            raise HTTPException(status_code=400, detail="Invalid user_type. Use 'individual' or 'employee'.")

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
    }

    if current_user.user_type == 'individual':
        profile = db.query(IndividualUser).filter(IndividualUser.user_id == current_user.id).first()
        if profile:
            response_data.update({
                "phone_number": profile.phone_number,
                "address": profile.address
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
    # If it's an organization user, they usually only see users in their tenant
    # For now, let's keep it simple and show all for simplicity or add tenant filtering
    query = db.query(User)
    
    # Optional: Filter by tenant if user is organizational
    # if current_user.user_type == 'organization':
    #     org_profile = db.query(OrganizationalUser).filter(OrganizationalUser.user_id == current_user.id).first()
    #     if org_profile:
    #         query = query.join(OrganizationalUser).filter(OrganizationalUser.tenant_id == org_profile.tenant_id)

    users = query.offset(skip).limit(limit).all()
    return users
