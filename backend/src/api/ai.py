from fastapi import APIRouter, Depends, HTTPException
from src.api import deps
from src.schemas.ai import TaskSuggestionRequest, TaskSuggestionResponse
from src.services.ai import ai_service
from src.models.models import User

router = APIRouter()

@router.post("/task-suggestion", response_model=TaskSuggestionResponse)
async def get_task_suggestion(
    request: TaskSuggestionRequest,
    current_user: User = Depends(deps.get_current_user)
):
    """
    Get AI-generated task suggestions based on description.
    """
    try:
        return await ai_service.get_task_suggestion(request.description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
