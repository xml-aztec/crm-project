from enum import Enum

from pydantic import BaseModel


class NotificationChannel(str, Enum):
    email = "email"
    in_app = "in_app"


class NotificationPreferenceOut(BaseModel):
    notification_type_code: str
    notification_type_label: str
    channel: NotificationChannel
    enabled: bool


class NotificationPreferenceUpdate(BaseModel):
    notification_type_code: str
    channel: NotificationChannel
    enabled: bool
