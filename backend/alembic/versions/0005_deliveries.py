"""create deliveries table with postgis geography points and jsonb planned_route

Revision ID: 0005_deliveries
Revises: 0004_vehicle_locations
Create Date: 2026-10-22 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geography

# revision identifiers, used by Alembic.
revision: str = "0005_deliveries"
down_revision: Union[str, None] = "0004_vehicle_locations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create delivery_status enum type safely
    delivery_status_enum = postgresql.ENUM(
        "PENDING",
        "ASSIGNED",
        "PICKED_UP",
        "IN_TRANSIT",
        "DELIVERED",
        "FAILED",
        "CANCELLED",
        name="delivery_status",
        create_type=False,
    )
    delivery_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create deliveries table
    op.create_table(
        "deliveries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("order_number", sa.String(100), nullable=False),
        sa.Column(
            "status",
            delivery_status_enum,
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("pickup_address", sa.String(500), nullable=False),
        sa.Column(
            "pickup_location",
            Geography(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("dropoff_address", sa.String(500), nullable=False),
        sa.Column(
            "dropoff_location",
            Geography(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column(
            "driver_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("picked_up_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("estimated_duration_mins", sa.Integer(), nullable=True),
        sa.Column(
            "planned_route",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["vehicle_id"],
            ["vehicles.id"],
            name="fk_deliveries_vehicle_id_vehicles",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["driver_id"],
            ["drivers.id"],
            name="fk_deliveries_driver_id_drivers",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 3. Create indices
    op.create_index(op.f("ix_deliveries_id"), "deliveries", ["id"], unique=False)
    op.create_index(op.f("ix_deliveries_order_number"), "deliveries", ["order_number"], unique=True)
    op.create_index(op.f("ix_deliveries_status"), "deliveries", ["status"], unique=False)
    op.create_index(op.f("ix_deliveries_vehicle_id"), "deliveries", ["vehicle_id"], unique=False)
    op.create_index(op.f("ix_deliveries_driver_id"), "deliveries", ["driver_id"], unique=False)

    op.execute(
        "CREATE INDEX idx_deliveries_pickup_location_gist ON deliveries USING GIST(pickup_location);"
    )
    op.execute(
        "CREATE INDEX idx_deliveries_dropoff_location_gist ON deliveries USING GIST(dropoff_location);"
    )
    op.execute(
        "CREATE INDEX idx_deliveries_created_at_desc ON deliveries (created_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_deliveries_created_at_desc;")
    op.execute("DROP INDEX IF EXISTS idx_deliveries_dropoff_location_gist;")
    op.execute("DROP INDEX IF EXISTS idx_deliveries_pickup_location_gist;")
    op.drop_index(op.f("ix_deliveries_driver_id"), table_name="deliveries")
    op.drop_index(op.f("ix_deliveries_vehicle_id"), table_name="deliveries")
    op.drop_index(op.f("ix_deliveries_status"), table_name="deliveries")
    op.drop_index(op.f("ix_deliveries_order_number"), table_name="deliveries")
    op.drop_index(op.f("ix_deliveries_id"), table_name="deliveries")
    op.drop_table("deliveries")
    op.execute("DROP TYPE IF EXISTS delivery_status;")
