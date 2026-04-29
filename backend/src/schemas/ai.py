from typing import List
from pydantic import BaseModel

class TaskSuggestionRequest(BaseModel):
    description: str

class TaskSuggestionResponse(BaseModel):
    estimated_hours: float
    required_skills: List[str]
    explanation: str
