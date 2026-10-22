import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.driver import Driver
    from app.models.vehicle_driver_assignment import VehicleDriverAssignment
    from app.models.vehicle_location import VehicleLocation


class VehicleType(enum.StrEnum):
    TRUCK = "TRUCK"
    VAN = "VAN"
    MOTORCYCLE = "MOTORCYCLE"
    CAR = "CAR"


class VehicleStatus(enum.StrEnum):
    ACTIVE = "ACTIVE"
    IDLE = "IDLE"
    OFFLINE = "OFFLINE"
    MAINTENANCE = "MAINTENANCE"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    plate_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
    )
    make: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    model: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    type: Mapped[VehicleType] = mapped_column(
        SQLEnum(
            VehicleType,
            name="vehicle_type",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=VehicleType.VAN,
        index=True,
    )
    status: Mapped[VehicleStatus] = mapped_column(
        SQLEnum(
            VehicleStatus,
            name="vehicle_status",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=VehicleStatus.IDLE,
        index=True,
    )
    fuel_capacity: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )
    current_fuel: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
    )

    # Quick-Access Live Fields for lightning-fast initial map loads
    last_lat: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    last_lng: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    last_speed: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Soft delete
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
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

    # Relationships
    assignments: Mapped[List["VehicleDriverAssignment"]] = relationship(
        "VehicleDriverAssignment",
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )
    locations: Mapped[List["VehicleLocation"]] = relationship(
        "VehicleLocation",
        back_populates="vehicle",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Vehicle {self.plate_number} ({self.make} {self.model})>"
