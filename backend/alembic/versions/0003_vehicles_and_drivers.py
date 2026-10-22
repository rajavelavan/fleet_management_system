"""create vehicles, drivers, and vehicle_driver_assignments tables

Revision ID: 0003_vehicles_and_drivers
Revises: 0002_create_users_table
Create Date: 2026-10-22 13:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0003_vehicles_and_drivers"
down_revision: Union[str, None] = "0002_create_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Enums
    vehicle_type_enum = postgresql.ENUM(
        "TRUCK", "VAN", "MOTORCYCLE", "CAR",
        name="vehicle_type",
        create_type=False,
    )
    vehicle_type_enum.create(op.get_bind(), checkfirst=True)

    vehicle_status_enum = postgresql.ENUM(
        "ACTIVE", "IDLE", "OFFLINE", "MAINTENANCE",
        name="vehicle_status",
        create_type=False,
    )
    vehicle_status_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create vehicles table
    op.create_table(
        "vehicles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("plate_number", sa.String(length=50), nullable=False),
        sa.Column("make", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column(
            "type",
            vehicle_type_enum,
            server_default="VAN",
            nullable=False,
        ),
        sa.Column(
            "status",
            vehicle_status_enum,
            server_default="IDLE",
            nullable=False,
        ),
        sa.Column("fuel_capacity", sa.Float(), server_default=sa.text("0.0"), nullable=False),
        sa.Column("current_fuel", sa.Float(), server_default=sa.text("0.0"), nullable=False),
        sa.Column("last_lat", sa.Float(), nullable=True),
        sa.Column("last_lng", sa.Float(), nullable=True),
        sa.Column("last_speed", sa.Float(), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
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
    op.create_index(op.f("ix_vehicles_id"), "vehicles", ["id"], unique=False)
    op.create_index(op.f("ix_vehicles_plate_number"), "vehicles", ["plate_number"], unique=True)
    op.create_index(op.f("ix_vehicles_type"), "vehicles", ["type"], unique=False)
    op.create_index(op.f("ix_vehicles_status"), "vehicles", ["status"], unique=False)
    op.create_index(op.f("ix_vehicles_deleted_at"), "vehicles", ["deleted_at"], unique=False)

    # 3. Create drivers table
    op.create_table(
        "drivers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("license_number", sa.String(length=100), nullable=False),
        sa.Column("license_expiry", sa.Date(), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_drivers_id"), "drivers", ["id"], unique=False)
    op.create_index(op.f("ix_drivers_user_id"), "drivers", ["user_id"], unique=True)
    op.create_index(op.f("ix_drivers_license_number"), "drivers", ["license_number"], unique=True)

    # 4. Create vehicle_driver_assignments table
    op.create_table(
        "vehicle_driver_assignments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("vehicle_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("unassigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_vehicle_driver_assignments_id"), "vehicle_driver_assignments", ["id"], unique=False)
    op.create_index(op.f("ix_vehicle_driver_assignments_vehicle_id"), "vehicle_driver_assignments", ["vehicle_id"], unique=False)
    op.create_index(op.f("ix_vehicle_driver_assignments_driver_id"), "vehicle_driver_assignments", ["driver_id"], unique=False)
    op.create_index(op.f("ix_vehicle_driver_assignments_is_active"), "vehicle_driver_assignments", ["is_active"], unique=False)


def downgrade() -> None:
    op.drop_table("vehicle_driver_assignments")
    op.drop_table("drivers")
    op.drop_table("vehicles")
    sa.Enum(name="vehicle_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="vehicle_type").drop(op.get_bind(), checkfirst=True)
