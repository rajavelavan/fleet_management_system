"""create geofences and alerts tables with postgis polygon and spatial indexing

Revision ID: 0006_geofences_and_alerts
Revises: 0005_deliveries
Create Date: 2026-10-22 16:51:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geography

# revision identifiers, used by Alembic.
revision: str = "0006_geofences_and_alerts"
down_revision: Union[str, None] = "0005_deliveries"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create alert_type enum type safely
    alert_type_enum = postgresql.ENUM(
        "GEOFENCE_ENTRY",
        "GEOFENCE_EXIT",
        "SPEEDING",
        "IDLING",
        "OFFLINE",
        name="alert_type",
        create_type=False,
    )
    alert_type_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create geofences table
    op.create_table(
        "geofences",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "area",
            Geography(geometry_type="POLYGON", srid=4326, spatial_index=False),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("speed_limit", sa.Float(), nullable=True),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_geofences_id"), "geofences", ["id"], unique=False)
    op.create_index(op.f("ix_geofences_name"), "geofences", ["name"], unique=False)
    op.create_index(op.f("ix_geofences_is_active"), "geofences", ["is_active"], unique=False)
    op.create_index(op.f("ix_geofences_created_by"), "geofences", ["created_by"], unique=False)

    # Spatial GiST index for geofences.area
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_geofences_area ON geofences USING GIST (area);"
    )

    # 3. Create alerts table
    op.create_table(
        "alerts",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "vehicle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vehicles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "alert_type",
            alert_type_enum,
            nullable=False,
        ),
        sa.Column("severity", sa.String(50), nullable=False, server_default="WARNING"),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "triggered_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alerts_id"), "alerts", ["id"], unique=False)
    op.create_index(op.f("ix_alerts_vehicle_id"), "alerts", ["vehicle_id"], unique=False)
    op.create_index(op.f("ix_alerts_alert_type"), "alerts", ["alert_type"], unique=False)
    op.create_index(op.f("ix_alerts_is_read"), "alerts", ["is_read"], unique=False)
    op.create_index(op.f("ix_alerts_triggered_at"), "alerts", ["triggered_at"], unique=False)


def downgrade() -> None:
    op.drop_table("alerts")
    op.execute("DROP INDEX IF EXISTS idx_geofences_area;")
    op.drop_table("geofences")
    op.execute("DROP TYPE IF EXISTS alert_type;")
