from celery import Celery
from src.config.settings import settings

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.task_routes = {
    "src.worker.send_email_notification": "main-queue",
    "src.worker.send_push_notification": "main-queue",
}

celery_app.conf.update(task_track_started=True)
