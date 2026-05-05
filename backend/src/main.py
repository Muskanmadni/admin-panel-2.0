import logging
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from src.config.settings import settings
from src.database.session import engine
from src.models.models import Base
from src.api import (
    projects,
    # tasks, 
    # time_entries, 
    # chat, 
    # payments, 
    # files, 
    # ai,
    users,
    auth,
    workflows,
    rbac,
    employee_projects,
    # dashboard
)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Custom Middleware for request timing and logging
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(
            f"Method: {request.method} Path: {request.url.path} "
            f"Status: {response.status_code} Duration: {process_time:.4f}s"
        )
        response.headers["X-Process-Time"] = str(process_time)
        return response

def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        description="Multi-tenant SaaS Employee Management System API"
    )

    # Set all CORS enabled origins
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Add custom logging middleware
    application.add_middleware(LoggingMiddleware)

    # Include Routers
    api_prefix = settings.API_V1_STR
    
    application.include_router(
        projects.router,
        prefix=f"{api_prefix}/projects",
        tags=["Projects"]
    )
    # application.include_router(
    #     tasks.router, 
    #     prefix=f"{api_prefix}/tasks", 
    #     tags=["Tasks"]
    # )
    # application.include_router(
    #     time_entries.router, 
    #     prefix=f"{api_prefix}/time", 
    #     tags=["Time Tracking"]
    # )
    # application.include_router(
    #     chat.router, 
    #     prefix=f"{api_prefix}/ws", 
    #     tags=["Real-time Chat"]
    # )
    # application.include_router(
    #     payments.router, 
    #     prefix=f"{api_prefix}/payments", 
    #     tags=["Payments"]
    # )
    # application.include_router(
    #     files.router, 
    #     prefix=f"{api_prefix}/files", 
    #     tags=["Files"]
    # )
    # application.include_router(
    #     ai.router, 
    #     prefix=f"{api_prefix}/ai", 
    #     tags=["AI Assistance"]
    # )
    application.include_router(
        users.router, 
        prefix=f"{api_prefix}/users", 
        tags=["Users"]
    )
    application.include_router(
        auth.router, 
        prefix=f"{api_prefix}/auth", 
        tags=["Auth"]
    )
    application.include_router(
        workflows.router,
        prefix=f"{api_prefix}/workflows",
        tags=["Workflows"]
    )
    application.include_router(
        rbac.router, 
        prefix=f"{api_prefix}/rbac", 
        tags=["RBAC"]
    )
    application.include_router(
        employee_projects.router,
        prefix=f"{api_prefix}/employee-projects",
        tags=["Employee Projects"]
    )
    # application.include_router(
    #     dashboard.router,
    #     prefix=f"{api_prefix}/dashboard",
    #     tags=["Dashboard"]
    # )

    @application.get("/", tags=["System"])
    def root():
        return {
            "message": f"Welcome to {settings.PROJECT_NAME} API",
            "docs": "/docs",
            "health": "/health"
        }

    @application.get("/health", tags=["System"])
    def health_check():
        return {
            "status": "healthy",
            "project_name": settings.PROJECT_NAME,
            "api_version": "v1"
        }

    return application

app = create_application()

Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
