from uuid import UUID
from sqlalchemy.orm import Session

from src.models.employee import ProjectTask
from src.models.workflow import Project
from src.services.ai import ai_service


async def generate_tasks_for_project(db: Session, project: Project) -> list[ProjectTask]:
    existing = db.query(ProjectTask).filter(ProjectTask.project_id == project.id).count()
    if existing > 0:
        return (
            db.query(ProjectTask)
            .filter(ProjectTask.project_id == project.id)
            .order_by(ProjectTask.sort_order)
            .all()
        )

    generated = await ai_service.generate_project_tasks(
        project_name=project.name,
        project_description=project.description,
        project_priority=project.priority,
        project_category=project.category,
        project_end_date=project.end_date,
    )

    tasks: list[ProjectTask] = []
    for idx, item in enumerate(generated):
        task = ProjectTask(
            project_id=project.id,
            title=item.title,
            description=item.description,
            sort_order=idx,
        )
        db.add(task)
        tasks.append(task)
    return tasks


def get_project_tasks(db: Session, project_id: UUID) -> list[ProjectTask]:
    return (
        db.query(ProjectTask)
        .filter(ProjectTask.project_id == project_id)
        .order_by(ProjectTask.sort_order)
        .all()
    )


def project_has_tasks(db: Session, project_id: UUID) -> bool:
    return db.query(ProjectTask).filter(ProjectTask.project_id == project_id).count() > 0
