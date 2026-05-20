from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from datetime import datetime

from src.api import deps
from src.models import User, EmployeeProject
from src.models.workflow import Project
from src.models.employee import Employee

router = APIRouter()


class AssignProjectIn(BaseModel):
    employee_id: UUID
    project_id: UUID


class EmployeeProjectOut(BaseModel):
    id: UUID
    employee_id: UUID
    project_id: UUID
    assigned_by: UUID
    status: str
    created_at: datetime
    progress_report: str | None = None
    # project details
    project_name: str
    project_description: str | None = None
    project_status: str
    project_priority: str
    project_progress: int
    project_end_date: str | None = None
    # employee details (for admin view)
    employee_name: str | None = None
    employee_email: str | None = None
    employee_role: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EmployeeOut(BaseModel):
    id: UUID
    full_name: str | None
    email: str
    role: str
    department: str | None = None

    model_config = ConfigDict(from_attributes=True)


@router.post("/assign", response_model=EmployeeProjectOut)
def assign_project(
    data: AssignProjectIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    existing = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == data.employee_id,
        EmployeeProject.project_id == data.project_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Project already assigned to this employee")

    project = db.query(Project).filter(Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ep = EmployeeProject(
        employee_id=data.employee_id,
        project_id=data.project_id,
        assigned_by=current_user.id,
        status="assigned",
    )
    db.add(ep)

    employee = db.query(User).filter(User.id == data.employee_id).first()
    if employee:
        project.assignee = employee.full_name or employee.email

    db.commit()
    db.refresh(ep)
    return _to_out(ep, project, employee, db)


@router.get("/my", response_model=List[EmployeeProjectOut])
def my_projects(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    rows = db.query(EmployeeProject).filter(
        EmployeeProject.employee_id == current_user.id
    ).all()
    result = []
    for ep in rows:
        project = db.query(Project).filter(Project.id == ep.project_id).first()
        if project:
            result.append(_to_out(ep, project, current_user, db))
    return result


@router.post("/{assignment_id}/reject")
def reject_project(
    assignment_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    ep = db.query(EmployeeProject).filter(EmployeeProject.id == assignment_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if ep.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    ep.status = "rejected"
    db.commit()
    return {"message": "Project rejected"}


@router.post("/{assignment_id}/accept")
def accept_project(
    assignment_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    ep = db.query(EmployeeProject).filter(EmployeeProject.id == assignment_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if ep.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    ep.status = "accepted"
    db.commit()
    return {"message": "Project accepted"}


class ProgressReportIn(BaseModel):
    report: str


@router.post("/{assignment_id}/progress-report")
def submit_progress_report(
    assignment_id: UUID,
    data: ProgressReportIn,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    ep = db.query(EmployeeProject).filter(EmployeeProject.id == assignment_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if ep.employee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    ep.progress_report = data.report
    db.commit()
    return {"message": "Progress report saved"}


@router.get("/", response_model=List[EmployeeProjectOut])
def list_assignments(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    query = db.query(EmployeeProject)
    if current_user.tenant_id:
        query = query.filter(
            EmployeeProject.employee_id.in_(
                db.query(User.id).filter(User.tenant_id == current_user.tenant_id)
            )
        )
    rows = query.all()
    result = []
    for ep in rows:
        project = db.query(Project).filter(Project.id == ep.project_id).first()
        employee = db.query(User).filter(User.id == ep.employee_id).first()
        if project:
            result.append(_to_out(ep, project, employee, db))
    return result


@router.get("/filter-employees", response_model=List[EmployeeOut])
def filter_employees_for_project(
    project_id: UUID = Query(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Return employees whose role/department matches the project's category or tags."""
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Build keyword list from project category and tags
    keywords: list[str] = []
    if project.category:
        keywords += [w.lower() for w in project.category.replace(",", " ").split()]
    if project.tags:
        import json
        try:
            tag_list = json.loads(project.tags) if project.tags.startswith("[") else project.tags.split(",")
        except Exception:
            tag_list = project.tags.split(",")
        keywords += [t.strip().lower() for t in tag_list]

    # Fetch all employees in the same tenant — use outerjoin so users without
    # an Employee profile row are still included
    employees = (
        db.query(User)
        .outerjoin(Employee, Employee.user_id == User.id)
        .filter(User.tenant_id == current_user.tenant_id, User.user_type == "employee")
        .all()
    )

    if not employees:
        # Fallback: tenant filter may be None for some setups — return all employees
        employees = db.query(User).filter(User.user_type == "employee").all()

    if not keywords:
        # No keywords — return all employees
        matched = employees
    else:
        # Score employees: match keywords against their role + department
        def score(u: User) -> int:
            emp_profile = db.query(Employee).filter(Employee.user_id == u.id).first()
            haystack = " ".join(filter(None, [
                u.role or "",
                emp_profile.role if emp_profile else "",
                emp_profile.department if emp_profile else "",
            ])).lower()
            return sum(1 for kw in keywords if kw in haystack)

        scored = [(u, score(u)) for u in employees]
        # Return employees with score > 0 first, then the rest
        scored.sort(key=lambda x: x[1], reverse=True)
        matched = [u for u, _ in scored]

    result = []
    for u in matched:
        emp_profile = db.query(Employee).filter(Employee.user_id == u.id).first()
        result.append(EmployeeOut(
            id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=u.role,
            department=emp_profile.department if emp_profile else None,
        ))
    return result


@router.delete("/{assignment_id}")
def unassign_project(
    assignment_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role not in ("admin", "super_admin", "manager"):
        raise HTTPException(status_code=403, detail="Not authorized")
    ep = db.query(EmployeeProject).filter(EmployeeProject.id == assignment_id).first()
    if not ep:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(ep)
    db.commit()
    return {"message": "Unassigned successfully"}


def _to_out(ep: EmployeeProject, project: Project, employee: Optional[User], db: Session = None) -> dict:
    emp_profile = db.query(Employee).filter(Employee.user_id == employee.id).first() if (db and employee) else None
    return {
        "id": ep.id,
        "employee_id": ep.employee_id,
        "project_id": ep.project_id,
        "assigned_by": ep.assigned_by,
        "status": ep.status,
        "created_at": ep.created_at,
        "progress_report": ep.progress_report,
        "project_name": project.name,
        "project_description": project.description,
        "project_status": project.status,
        "project_priority": project.priority,
        "project_progress": project.progress,
        "project_end_date": project.end_date,
        "employee_name": employee.full_name if employee else None,
        "employee_email": employee.email if employee else None,
        "employee_role": (emp_profile.role if emp_profile and emp_profile.role else None) or (employee.role if employee else None),
    }
