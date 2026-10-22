"""create vehicle_locations table with postgis geography point and indexes

Revision ID: 0004_vehicle_locations
Revises: 0003_vehicles_and_drivers
Create Date: 2026-10-22 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geography

# revision identifiers, used by Alembic.
revision: str = "0004_vehicle_locations"
down_revision: Union[str, None] = "0003_vehicles_and_drivers"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create vehicle_locations table
    op.create_table(
        "vehicle_locations",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "location",
            Geography(geometry_type="POINT", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("speed", sa.Float(), nullable=True),
        sa.Column("heading", sa.Float(), nullable=True),
        sa.Column("altitude", sa.Float(), nullable=True),
        sa.Column("accuracy", sa.Float(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["vehicle_id"],
            ["vehicles.id"],
            name="fk_vehicle_locations_vehicle_id_vehicles",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 2. Basic index on id and vehicle_id
    op.create_index(op.f("ix_vehicle_locations_id"), "vehicle_locations", ["id"], unique=False)
    op.create_index(op.f("ix_vehicle_locations_vehicle_id"), "vehicle_locations", ["vehicle_id"], unique=False)

    # 3. Spatial GIST Index on location
    op.execute(
        "CREATE INDEX idx_vehicle_locations_location_gist ON vehicle_locations USING GIST(location);"
    )

    # 4. Time-series index: (vehicle_id, recorded_at DESC)
    op.execute(
        "CREATE INDEX idx_vehicle_locations_vehicle_recorded_at_desc ON vehicle_locations (vehicle_id, recorded_at DESC);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_vehicle_locations_vehicle_recorded_at_desc;")
    op.execute("DROP INDEX IF EXISTS idx_vehicle_locations_location_gist;")
    op.drop_index(op.f("ix_vehicle_locations_vehicle_id"), table_name="vehicle_locations")
    op.drop_index(op.f("ix_vehicle_locations_id"), table_name="vehicle_locations")
    op.drop_table("vehicle_locations")
