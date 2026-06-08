import shutil
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from src.api import deps
from src.models import User
from src.models.employee import SignupPolicy

router = APIRouter()

ADMIN_ROLES = ("admin", "super_admin", "manager")
VALID_POLICY_IDS = ("terms", "policies")

POLICIES_DIR = Path(__file__).resolve().parents[2] / "uploads" / "policies"
FRONTEND_POLICIES_DIR = Path(__file__).resolve().parents[3] / "frontend" / "public" / "policies"

STORAGE_FILES = {
    "terms": "terms.pdf",
    "policies": "office-policies.pdf",
}

DEFAULT_POLICIES = {
    "terms": {
        "label": "Terms & Conditions",
        "title": "Remote Internship Compensation & Work Policy",
        "file_name": "compensation-work-policy.pdf",
        "file_url": "/policies/compensation-work-policy.pdf",
    },
    "policies": {
        "label": "Office Policies",
        "title": "Updated Office Policies 2025",
        "file_name": "office-policies-2025.pdf",
        "file_url": "/policies/office-policies-2025.pdf",
    },
}

FRONTEND_SOURCE_FILES = {
    "terms": "compensation-work-policy.pdf",
    "policies": "office-policies-2025.pdf",
}


class PolicyOut(BaseModel):
    id: str
    label: str
    title: str
    url: str
    file_name: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PolicyUpdateIn(BaseModel):
    label: str = Field(..., min_length=1, max_length=120)
    title: str = Field(..., min_length=1, max_length=255)


def _require_admin(user: User) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")


def _validate_policy_id(policy_id: str) -> None:
    if policy_id not in VALID_POLICY_IDS:
        raise HTTPException(status_code=404, detail="Policy not found")


def _seed_policy_files() -> None:
    POLICIES_DIR.mkdir(parents=True, exist_ok=True)
    for policy_id, dest_name in STORAGE_FILES.items():
        dest = POLICIES_DIR / dest_name
        if dest.exists():
            continue
        src_name = FRONTEND_SOURCE_FILES[policy_id]
        src = FRONTEND_POLICIES_DIR / src_name
        if src.exists():
            shutil.copy(src, dest)


def _ensure_seeded(db: Session) -> None:
    _seed_policy_files()
    changed = False
    for policy_id, defaults in DEFAULT_POLICIES.items():
        row = db.query(SignupPolicy).filter(SignupPolicy.id == policy_id).first()
        if row:
            continue
        row = SignupPolicy(
            id=policy_id,
            label=defaults["label"],
            title=defaults["title"],
            storage_path=STORAGE_FILES[policy_id],
            file_name=defaults["file_name"],
            file_url=defaults["file_url"],
        )
        db.add(row)
        changed = True
    if changed:
        db.commit()


def _policy_url(row: SignupPolicy) -> str:
    if row.file_url and row.file_url.startswith("/api/"):
        return row.file_url
    if row.file_url:
        return row.file_url
    return f"/api/v1/policies/files/{row.storage_path}"


def _to_out(row: SignupPolicy) -> dict:
    return {
        "id": row.id,
        "label": row.label,
        "title": row.title,
        "url": _policy_url(row),
        "file_name": row.file_name,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/", response_model=List[PolicyOut])
def list_policies(db: Session = Depends(deps.get_db)):
    """Public endpoint used by the signup page."""
    _ensure_seeded(db)
    rows = db.query(SignupPolicy).order_by(SignupPolicy.id).all()
    return [_to_out(row) for row in rows]


@router.get("/files/{filename}")
def get_policy_file(filename: str):
    if filename not in STORAGE_FILES.values():
        raise HTTPException(status_code=404, detail="File not found")

    path = POLICIES_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=filename,
        content_disposition_type="inline",
    )


@router.patch("/{policy_id}", response_model=PolicyOut)
def update_policy_metadata(
    policy_id: str,
    payload: PolicyUpdateIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    _validate_policy_id(policy_id)
    _ensure_seeded(db)

    row = db.query(SignupPolicy).filter(SignupPolicy.id == policy_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")

    row.label = payload.label.strip()
    row.title = payload.title.strip()
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.post("/{policy_id}/upload", response_model=PolicyOut)
async def upload_policy_file(
    policy_id: str,
    file: UploadFile = File(...),
    label: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    _require_admin(current_user)
    _validate_policy_id(policy_id)
    _ensure_seeded(db)

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        if not (file.filename or "").lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF must be under 15MB")

    storage_name = STORAGE_FILES[policy_id]
    POLICIES_DIR.mkdir(parents=True, exist_ok=True)
    dest = POLICIES_DIR / storage_name
    dest.write_bytes(content)

    row = db.query(SignupPolicy).filter(SignupPolicy.id == policy_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Policy not found")

    defaults = DEFAULT_POLICIES[policy_id]
    row.label = (label or row.label or defaults["label"]).strip()
    row.title = (title or row.title or defaults["title"]).strip()
    row.storage_path = storage_name
    row.file_name = file.filename or defaults["file_name"]

    db.commit()
    db.refresh(row)

    row.file_url = f"/api/v1/policies/files/{storage_name}?v={int(row.updated_at.timestamp())}"
    db.commit()
    db.refresh(row)

    return _to_out(row)
