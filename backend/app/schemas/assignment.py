import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DriverAssignmentRequest(BaseModel):
    driver_id: uuid.UUID


class DriverAssignmentResponse(BaseModel):
    id: uuid.UUID
    vehicle_id: uuid.UUID
    driver_id: uuid.UUID
    assigned_at: datetime
    unassigned_at: Optional[datetime] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
