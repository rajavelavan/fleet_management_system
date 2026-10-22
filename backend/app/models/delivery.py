import enum
import uuid
from datetime import datetime
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DeliveryStatus(enum.StrEnum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    PICKED_UP = "PICKED_UP"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Delivery(Base):
    __tablename__ = "deliveries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    order_number: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        SQLEnum(
            DeliveryStatus,
            name="delivery_status",
            native_enum=True,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=DeliveryStatus.PENDING,
        index=True,
    )
    pickup_address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    pickup_location: Mapped[Geography] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    dropoff_address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    dropoff_location: Mapped[Geography] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("drivers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    picked_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    estimated_duration_mins: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    planned_route: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
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
    vehicle = relationship("Vehicle", lazy="joined")
    driver = relationship("Driver", lazy="joined")

    __table_args__ = (
        Index(
            "idx_deliveries_pickup_location_gist",
            "pickup_location",
            postgresql_using="gist",
        ),
        Index(
            "idx_deliveries_dropoff_location_gist",
            "dropoff_location",
            postgresql_using="gist",
        ),
        Index("idx_deliveries_status", "status"),
        Index("idx_deliveries_created_at_desc", created_at.desc()),
    )

    def __repr__(self) -> str:
        return f"<Delivery order={self.order_number} status={self.status}>"
