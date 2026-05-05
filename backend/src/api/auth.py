from typing import Optional
from datetime import datetime, timedelta
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import jwt

from src.config.settings import settings
from src.database.session import SessionLocal
from src.models.models import User, IndividualUser, Tenant

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: str
    user_type: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SUPABASE_JWT_SECRET, algorithm=settings.SUPABASE_JWT_ALGORITHM)

@router.post("/login", response_model=Token)
def login(supabase_user_id: str):
    """Login with Supabase user ID."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.supabase_user_id == UUID(supabase_user_id)).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is inactive"
            )
        
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role, "user_type": user.user_type}
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user.id),
            role=user.role,
            user_type=user.user_type
        )
    finally:
        db.close()

@router.post("/register/individual", response_model=Token)
def register_individual(
    supabase_user_id: str,
    email: str,
    full_name: Optional[str] = None,
    phone_number: Optional[str] = None,
    address: Optional[str] = None,
    date_of_birth: Optional[datetime] = None
):
    """Register a new individual user."""
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(
            (User.email == email) | (User.supabase_user_id == UUID(supabase_user_id))
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or Supabase user ID already registered"
            )
        
        # Create user
        user = User(
            supabase_user_id=UUID(supabase_user_id),
            email=email,
            full_name=full_name,
            user_type="individual",
            role="employee",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create individual profile
        ind_user = IndividualUser(
            user_id=user.id,
            phone_number=phone_number,
            address=address,
            date_of_birth=date_of_birth
        )
        db.add(ind_user)
        db.commit()
        
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role, "user_type": user.user_type}
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user.id),
            role=user.role,
            user_type=user.user_type
        )
    finally:
        db.close()