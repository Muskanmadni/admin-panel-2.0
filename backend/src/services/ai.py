import openai
from src.config.settings import settings
from src.schemas.ai import TaskSuggestionResponse

class AIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    async def get_task_suggestion(self, description: str) -> TaskSuggestionResponse:
        if not self.client:
            return TaskSuggestionResponse(
                estimated_hours=0,
                required_skills=[],
                explanation="OpenAI API key not configured."
            )

        prompt = f"Given the following task description, estimate the required hours and list the necessary skills:\n\n{description}"
        
        try:
            response = self.client.beta.chat.completions.parse(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a senior project manager assistant. Provide realistic task estimates and required skills."},
                    {"role": "user", "content": prompt}
                ],
                response_format=TaskSuggestionResponse,
            )
            return response.choices[0].message.parsed
        except Exception as e:
            # Fallback or error handling
            raise Exception(f"AI Service Error: {str(e)}")

ai_service = AIService()
