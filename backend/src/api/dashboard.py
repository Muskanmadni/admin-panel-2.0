from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.api import deps
from src.models.models import User, Project, Task, Tenant, LeaveRequest
from src.schemas.user import User as UserSchema

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get statistics for the dashboard.
    """
    tenant_id = current_user.tenant_id

    total_users = db.query(User).filter(User.tenant_id == tenant_id).count()
    total_projects = db.query(Project).filter(Project.tenant_id == tenant_id).count()
    total_tasks = db.query(Task).filter(Task.tenant_id == tenant_id).count()
    
    # Active tasks: tasks that are not done
    active_tasks = db.query(Task).filter(
        Task.tenant_id == tenant_id,
        Task.status != "done"
    ).count()
    
    # Pending actions: tasks in 'todo' status or pending leave requests
    todo_tasks = db.query(Task).filter(
        Task.tenant_id == tenant_id,
        Task.status == "todo"
    ).count()
    
    pending_leaves = db.query(LeaveRequest).filter(
        LeaveRequest.tenant_id == tenant_id,
        LeaveRequest.status == "pending"
    ).count()

    # Get some recent activity (e.g., last 5 tasks created)
    # This could be expanded later
    
    return {
        "totalUsers": total_users,
        "totalProjects": total_projects,
        "totalTasks": total_tasks,
        "activeTasks": active_tasks,
        "pendingActions": todo_tasks + pending_leaves,
        # We can add trends later if needed
        "usersTrend": "+0% this month", # Placeholder
        "projectsTrend": f"{total_projects} total",
        "activeTasksTrend": f"{int((active_tasks/total_tasks)*100) if total_tasks > 0 else 0}% of total",
        "pendingActionsTrend": f"{pending_leaves} urgent"
    }
