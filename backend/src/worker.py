import logging
import json
import firebase_admin
from firebase_admin import credentials, messaging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from src.core.celery_app import celery_app
from src.config.settings import settings

logger = logging.getLogger(__name__)

# Initialize Firebase
if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
    try:
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON.startswith("{"):
            service_account_info = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(service_account_info)
        else:
            cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")

@celery_app.task(name="src.worker.send_email_notification")
def send_email_notification(to_email: str, subject: str, html_content: str):
    if not settings.SENDGRID_API_KEY:
        logger.warning("SENDGRID_API_KEY not set, skipping email")
        return False
    
    message = Mail(
        from_email=settings.FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=html_content
    )
    try:
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

@celery_app.task(name="src.worker.send_push_notification")
def send_push_notification(token: str, title: str, body: str, data: dict = None):
    if not firebase_admin._apps:
        logger.warning("Firebase not initialized, skipping push notification")
        return False

    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        token=token,
    )
    try:
        response = messaging.send(message)
        logger.info(f"Successfully sent push notification: {response}")
        return True
    except Exception as e:
        logger.error(f"Error sending push notification: {e}")
        return False

@celery_app.task(name="src.worker.notify_task_assignment")
def notify_task_assignment(user_email: str, user_fcm_token: str, task_title: str):
    # Send Email
    send_email_notification.delay(
        to_email=user_email,
        subject="New Task Assigned",
        html_content=f"You have been assigned a new task: <strong>{task_title}</strong>"
    )
    # Send Push if token exists
    if user_fcm_token:
        send_push_notification.delay(
            token=user_fcm_token,
            title="New Task Assigned",
            body=f"Task: {task_title}"
        )

@celery_app.task(name="src.worker.notify_time_approval")
def notify_time_approval(user_email: str, user_fcm_token: str, duration_hours: float):
    send_email_notification.delay(
        to_email=user_email,
        subject="Time Log Approved",
        html_content=f"Your time log for {duration_hours} hours has been approved."
    )
    if user_fcm_token:
        send_push_notification.delay(
            token=user_fcm_token,
            title="Time Log Approved",
            body=f"{duration_hours} hours approved."
        )
