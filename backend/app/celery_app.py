from celery import Celery
from celery.schedules import crontab

from app.config import settings

# Celery Application initialization
celery_app = Celery(
    "fleet_tasks",
    broker=str(settings.REDIS_URL),
    backend=str(settings.REDIS_URL),
    include=["app.tasks.scheduled_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    broker_connection_retry_on_startup=True,
)

# Celery Beat Schedule Configuration
celery_app.conf.beat_schedule = {
    # 1. Hourly check (at minute 0) to mark vehicles as OFFLINE if no GPS ping in 15 mins
    "check-unresponsive-vehicles-hourly": {
        "task": "app.tasks.scheduled_tasks.mark_unresponsive_vehicles_offline",
        "schedule": crontab(minute=0),  # runs every hour on the hour
    },
    # 2. Daily summary task: compile daily fleet KPIs, completed shipments, and maintenance digests at midnight
    "daily-fleet-summary-midnight": {
        "task": "app.tasks.scheduled_tasks.daily_fleet_summary_digest",
        "schedule": crontab(hour=0, minute=0),  # runs daily at midnight UTC
    },
}
