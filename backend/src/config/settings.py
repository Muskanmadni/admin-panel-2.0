from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Employee System"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/postgres"
    
    # SUPABASE / AUTH
    SUPABASE_JWT_SECRET: str = "your-supabase-jwt-secret"
    SUPABASE_JWT_ALGORITHM: str = "HS256"
    SUPABASE_JWT_JWKS_URL: Optional[str] = None
    SUPABASE_JWT_AUDIENCE: Optional[str] = None
    SUPABASE_JWT_ISSUER: Optional[str] = None
    
    # CELERY / REDIS
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    CELERY_BROKER_URL: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
    CELERY_RESULT_BACKEND: str = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

    # NOTIFICATIONS
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "notifications@example.com"
    FIREBASE_SERVICE_ACCOUNT_JSON: Optional[str] = None # JSON string or path to file
    
    # STRIPE
    STRIPE_API_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:3000"

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "your-bucket-name"
    
    # OPENAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"

    # GEMINI
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000", 
        "http://localhost:8000",
        "http://localhost:5173"
    ]
    
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )


settings = Settings()
