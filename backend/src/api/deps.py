from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session
import uuid
import logging
import json
import urllib.request

from src.config.settings import settings
from src.database.session import SessionLocal
from src.models.models import User

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token",
    auto_error=False
)

_jwks_cache: dict | None = None

def _load_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    if not settings.SUPABASE_JWT_JWKS_URL:
        raise RuntimeError("SUPABASE_JWT_JWKS_URL must be configured for ES256 token verification")
    try:
        with urllib.request.urlopen(settings.SUPABASE_JWT_JWKS_URL, timeout=5) as response:
            _jwks_cache = json.loads(response.read().decode())
            return _jwks_cache
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Unable to load JWKs: {exc}")

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    user_type: Optional[str] = None
    exp: Optional[int] = None

def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

async def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    try:
        payload = jwt.get_unverified_claims(token)
        logger.info(f"Token payload: {payload}")
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError) as e:
        logger.error(f"Token decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Invalid token: {str(e)}",
        )
    
    try:
        user_id = uuid.UUID(token_data.sub)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid user ID in token",
        )
    
    user = db.query(User).filter(User.supabase_user_id == user_id).first()
    if not user:
        # Check by email (user may have signed up before)
        email = payload.get("email", "")
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Link supabase_user_id to existing user
            user.supabase_user_id = user_id
            db.commit()
            db.refresh(user)
        else:
            # Auto-create user on first login
            user_metadata = payload.get("user_metadata", {})
            app_metadata = payload.get("app_metadata", {})
            email = payload.get("email", "")
            full_name = user_metadata.get("full_name") or payload.get("full_name")
            user_type = user_metadata.get("account_type", "individual")
            
            user = User(
                supabase_user_id=user_id,
                email=email,
                full_name=full_name,
                user_type=user_type,
                role="employee",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"The user doesn't have enough privileges. Required: {self.allowed_roles}"
            )
        return user

# Helper dependency for multi-tenancy context
def get_current_tenant_user(
    user: User = Depends(get_current_user)
) -> User:
    # This can be used to ensure the tenant context is always available
    return user
