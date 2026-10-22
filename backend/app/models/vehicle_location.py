import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Float, ForeignKey, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.vehicle import Vehicle


class VehicleLocation(Base):
    __tablename__ = "vehicle_locations"

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
    location: Mapped[Geography] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )
    speed: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    heading: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    altitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    accuracy: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(
        "Vehicle",
        back_populates="locations",
    )

    __table_args__ = (
        # Spatial GIST index for geographic queries
        Index(
            "idx_vehicle_locations_location_gist",
            "location",
            postgresql_using="gist",
        ),
        # Time-series index for fast ordered queries per vehicle
        Index(
            "idx_vehicle_locations_vehicle_recorded_at_desc",
            "vehicle_id",
            recorded_at.desc(),
        ),
    )

    def __repr__(self) -> str:
        return f"<VehicleLocation vehicle_id={self.vehicle_id} recorded_at={self.recorded_at}>"
