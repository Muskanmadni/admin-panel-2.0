from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api import deps
from src.models.models import User
from src.models.workflow import Project
from src.models.employee import LeaveRequest

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    tenant_id = current_user.tenant_id

    def tenant_filter(q, model):
        if tenant_id:
            return q.filter(model.tenant_id == tenant_id)
        return q

    total_users = tenant_filter(db.query(User), User).count()
    total_projects = tenant_filter(db.query(Project), Project).count()
    pending_leaves = db.query(LeaveRequest).filter(LeaveRequest.status == "pending").count()

    return {
        "totalUsers": total_users,
        "totalProjects": total_projects,
        "totalTasks": 0,
        "activeTasks": 0,
        "pendingActions": pending_leaves,
        "usersTrend": "+0% this month",
        "projectsTrend": f"{total_projects} total",
        "activeTasksTrend": "N/A",
        "pendingActionsTrend": f"{pending_leaves} urgent"
    }
