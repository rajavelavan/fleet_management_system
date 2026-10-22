import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.vehicle import Vehicle


class AlertType(enum.StrEnum):
    GEOFENCE_ENTRY = "GEOFENCE_ENTRY"
    GEOFENCE_EXIT = "GEOFENCE_EXIT"
    SPEEDING = "SPEEDING"
    IDLING = "IDLING"
    OFFLINE = "OFFLINE"


class AlertSeverity(enum.StrEnum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class Geofence(Base):
    __tablename__ = "geofences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    area: Mapped[Geography] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326, spatial_index=False),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )
    speed_limit: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    creator: Mapped[Optional["User"]] = relationship(
        "User",
        foreign_keys=[created_by],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Geofence id={self.id} name={self.name} is_active={self.is_active}>"


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alert_type: Mapped[AlertType] = mapped_column(
        SQLEnum(
            AlertType,
            name="alert_type",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        index=True,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="WARNING",
    )
    message: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    metadata_: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=func.json_build_object(),
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        foreign_keys=[vehicle_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Alert id={self.id} type={self.alert_type} vehicle_id={self.vehicle_id} is_read={self.is_read}>"
