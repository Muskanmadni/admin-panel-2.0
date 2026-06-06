import json
import re
from typing import List

import google.generativeai as genai

from src.config.settings import settings
from src.schemas.ai import TaskSuggestionResponse
from src.schemas.assignment_task import GeneratedTaskItem

FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
]


class AIService:
    def __init__(self):
        self._gemini_configured = False
        self._models: list[str] = []
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self._gemini_configured = True
            primary = settings.GEMINI_MODEL
            self._models = [primary] + [m for m in FALLBACK_MODELS if m != primary]

    def _generate_with_fallback(self, prompt: str) -> str:
        last_error: Exception | None = None
        for model_name in self._models:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                text = response.text
                if not text:
                    raise Exception(f"Model {model_name} returned empty response")
                return text
            except Exception as e:
                last_error = e
                err = str(e)
                if "429" in err or "quota" in err.lower() or "404" in err:
                    continue
                raise
        raise last_error or Exception("All Gemini models failed")

    async def get_task_suggestion(self, description: str) -> TaskSuggestionResponse:
        if not self._gemini_configured:
            return TaskSuggestionResponse(
                estimated_hours=0,
                required_skills=[],
                explanation="Gemini API key not configured.",
            )

        prompt = (
            f"Given the following task description, estimate the required hours and list the necessary skills.\n\n"
            f"{description}\n\n"
            "Respond with valid JSON only in this format:\n"
            '{"estimated_hours": 0, "required_skills": ["skill1"], "explanation": "brief explanation"}'
        )

        try:
            data = self._parse_json_response(self._generate_with_fallback(prompt))
            return TaskSuggestionResponse(
                estimated_hours=float(data.get("estimated_hours", 0)),
                required_skills=data.get("required_skills", []),
                explanation=data.get("explanation", ""),
            )
        except Exception as e:
            raise Exception(f"AI Service Error: {self._friendly_error(e)}")

    async def generate_project_tasks(
        self,
        *,
        project_name: str,
        project_description: str | None,
        project_priority: str,
        project_category: str | None = None,
        project_end_date: str | None = None,
    ) -> List[GeneratedTaskItem]:
        if not self._gemini_configured:
            raise Exception("Gemini API key not configured.")

        prompt = f"""You are a senior project manager. Break down the following project into 5 to 8 clear, actionable tasks for an employee to complete.

Project Name: {project_name}
Description: {project_description or "No description provided"}
Priority: {project_priority}
Category: {project_category or "General"}
Deadline: {project_end_date or "Not specified"}

Return valid JSON only in this exact format:
{{
  "tasks": [
    {{"title": "Task title", "description": "Brief description of what to do"}}
  ]
}}

Rules:
- Tasks must be specific and achievable
- Order tasks logically from setup to delivery
- Keep titles under 100 characters
- Do not include markdown or extra text outside the JSON"""

        try:
            data = self._parse_json_response(self._generate_with_fallback(prompt))
            raw_tasks = data.get("tasks", [])
            tasks: List[GeneratedTaskItem] = []
            for item in raw_tasks:
                title = (item.get("title") or "").strip()
                if not title:
                    continue
                tasks.append(GeneratedTaskItem(
                    title=title[:500],
                    description=(item.get("description") or "").strip() or None,
                ))
            if not tasks:
                raise Exception("AI returned no tasks")
            return tasks
        except Exception as e:
            raise Exception(f"Failed to generate project tasks: {self._friendly_error(e)}")

    def _friendly_error(self, error: Exception) -> str:
        msg = str(error)
        if "429" in msg or "quota" in msg.lower():
            return "Gemini API quota exceeded. Try again later or use a different API key/model."
        if "API key not valid" in msg or "API_KEY_INVALID" in msg:
            return "Invalid Gemini API key. Check GEMINI_API_KEY in backend/.env"
        if "404" in msg and "not found" in msg.lower():
            return f"Gemini model not available. Set GEMINI_MODEL to gemini-2.5-flash in .env"
        return msg

    def _parse_json_response(self, text: str) -> dict:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            cleaned = match.group(0)
        return json.loads(cleaned)


ai_service = AIService()
