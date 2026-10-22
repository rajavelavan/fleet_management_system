import io
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import require_dispatcher
from app.api.v1.endpoints.analytics import haversine_km
from app.database import get_db
from app.models.delivery import Delivery
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.vehicle_location import VehicleLocation

router = APIRouter()

# Styling constants for openpyxl
HEADER_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
TITLE_FONT = Font(name="Calibri", size=16, bold=True, color="0F172A")
SUBTITLE_FONT = Font(name="Calibri", size=10, italic=True, color="64748B")
DATA_FONT = Font(name="Calibri", size=10, color="0F172A")
STATUS_FONT_BOLD = Font(name="Calibri", size=10, bold=True)

THIN_BORDER_SIDE = Side(border_style="thin", color="CBD5E1")
DATA_BORDER = Border(
    left=THIN_BORDER_SIDE,
    right=THIN_BORDER_SIDE,
    top=THIN_BORDER_SIDE,
    bottom=THIN_BORDER_SIDE,
)

ZEBRA_FILL = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
WHITE_FILL = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")


def auto_fit_columns(ws, min_width=12):
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            # Skip title and subtitle rows
            if cell.row in [1, 2]:
                continue
            val = cell.value
            if val is not None:
                max_len = max(max_len, len(str(val)))
        ws.column_dimensions[col_letter].width = max(max_len + 4, min_width)


@router.get(
    "/deliveries/export",
    summary="Export Deliveries Report",
    description="Streams a professionally formatted Excel (.xlsx) report containing delivery shipments and operational metrics.",
)
async def export_deliveries_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_dispatcher)],
    format: Annotated[str, Query(description="Export format")] = "xlsx",
) -> Response:
    _ = format
    # Query all deliveries with relationships
    query = (
        select(Delivery)
        .options(selectinload(Delivery.vehicle), selectinload(Delivery.driver))
        .order_by(Delivery.created_at.desc())
    )
    deliveries = (await db.execute(query)).scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Deliveries Report"

    # Title Block
    ws.merge_cells("A1:I1")
    title_cell = ws["A1"]
    title_cell.value = "FLEET & LOGISTICS - DELIVERIES REPORT"
    title_cell.font = TITLE_FONT
    title_cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 30

    # Subtitle / Export Metadata
    ws.merge_cells("A2:I2")
    sub_cell = ws["A2"]
    now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    sub_cell.value = f"Generated on {now_str} | Total Deliveries: {len(deliveries)}"
    sub_cell.font = SUBTITLE_FONT
    sub_cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    # Blank spacer row 3
    ws.row_dimensions[3].height = 10

    # Table Headers on Row 4
    headers = [
        "Order #",
        "Status",
        "Assigned Vehicle",
        "Driver Contact",
        "Pickup Address",
        "Dropoff Address",
        "Estimated Duration",
        "Created At",
        "Delivered At",
    ]
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col_idx, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = DATA_BORDER
    ws.row_dimensions[4].height = 25

    # Data Rows starting at row 5
    for row_idx, d in enumerate(deliveries, start=5):
        is_zebra = (row_idx % 2 == 0)
        row_fill = ZEBRA_FILL if is_zebra else WHITE_FILL

        vehicle_str = (
            f"{d.vehicle.plate_number} ({d.vehicle.make} {d.vehicle.model})"
            if d.vehicle
            else "Unassigned"
        )
        driver_str = (
            f"{d.driver.user.email if d.driver.user else 'Driver'} ({d.driver.phone})"
            if d.driver
            else "Unassigned"
        )
        duration_str = f"{d.estimated_duration_mins} mins" if d.estimated_duration_mins else "N/A"
        created_str = d.created_at.strftime("%Y-%m-%d %H:%M") if d.created_at else "N/A"
        delivered_str = d.delivered_at.strftime("%Y-%m-%d %H:%M") if d.delivered_at else "N/A"

        row_data = [
            d.order_number,
            d.status.value if hasattr(d.status, "value") else str(d.status),
            vehicle_str,
            driver_str,
            d.pickup_address,
            d.dropoff_address,
            duration_str,
            created_str,
            delivered_str,
        ]

        for col_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = DATA_FONT
            cell.fill = row_fill
            cell.border = DATA_BORDER

            # Alignment formatting
            if col_idx in [1, 2, 7, 8, 9]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

            # Status color highlights
            if col_idx == 2:
                cell.font = STATUS_FONT_BOLD
                if val == "DELIVERED":
                    cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                elif val == "FAILED":
                    cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                elif val in ["IN_TRANSIT", "PICKED_UP"]:
                    cell.fill = PatternFill(start_color="E0F2FE", end_color="E0F2FE", fill_type="solid")
                elif val in ["PENDING", "ASSIGNED"]:
                    cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

        ws.row_dimensions[row_idx].height = 20

    auto_fit_columns(ws)

    # Save to buffer
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    xlsx_bytes = output.getvalue()

    filename = f"deliveries_report_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/trips/export",
    summary="Export Vehicle Trips Report",
    description="Streams a formatted Excel (.xlsx) report calculating distance, duration, and telemetry speeds per vehicle.",
)
async def export_trips_report(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_dispatcher)],
    format: Annotated[str, Query(description="Export format")] = "xlsx",
) -> Response:
    _ = format
    # 1. Fetch all active vehicles
    v_query = select(Vehicle).where(Vehicle.deleted_at.is_(None)).order_by(Vehicle.plate_number.asc())
    vehicles = (await db.execute(v_query)).scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Vehicle Trips Summary"

    # Title Block
    ws.merge_cells("A1:H1")
    title_cell = ws["A1"]
    title_cell.value = "FLEET & LOGISTICS - VEHICLE TRIPS & TELEMETRY REPORT"
    title_cell.font = TITLE_FONT
    title_cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 30

    # Subtitle
    ws.merge_cells("A2:H2")
    sub_cell = ws["A2"]
    now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    sub_cell.value = f"Generated on {now_str} | Active Vehicles Evaluated: {len(vehicles)}"
    sub_cell.font = SUBTITLE_FONT
    sub_cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[2].height = 18

    # Row 3 spacer
    ws.row_dimensions[3].height = 10

    # Table Headers on Row 4
    headers = [
        "Plate Number",
        "Vehicle Type",
        "Make / Model",
        "Status",
        "Total Distance (km)",
        "Operating Hours",
        "Average Speed (km/h)",
        "Max Recorded Speed (km/h)",
    ]
    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=4, column=col_idx, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = DATA_BORDER
    ws.row_dimensions[4].height = 25

    # Data rows
    for row_idx, v in enumerate(vehicles, start=5):
        # Query locations for this vehicle
        geom_cast = func.geometry(VehicleLocation.location)
        loc_query = (
            select(
                func.ST_X(geom_cast).label("lon"),
                func.ST_Y(geom_cast).label("lat"),
                VehicleLocation.speed,
                VehicleLocation.recorded_at,
            )
            .where(VehicleLocation.vehicle_id == v.id)
            .order_by(VehicleLocation.recorded_at.asc())
        )
        locs = (await db.execute(loc_query)).all()

        total_dist = 0.0
        max_speed = 0.0
        speeds = []
        for i in range(len(locs)):
            spd = locs[i].speed or 0.0
            speeds.append(spd)
            if spd > max_speed:
                max_speed = spd
            if i > 0:
                dist = haversine_km(
                    float(locs[i - 1].lat),
                    float(locs[i - 1].lon),
                    float(locs[i].lat),
                    float(locs[i].lon),
                )
                total_dist += dist

        duration_hours = 0.0
        if len(locs) > 1:
            duration_hours = max((locs[-1].recorded_at - locs[0].recorded_at).total_seconds(), 0.0) / 3600.0

        avg_speed = sum(speeds) / len(speeds) if speeds else 0.0

        is_zebra = (row_idx % 2 == 0)
        row_fill = ZEBRA_FILL if is_zebra else WHITE_FILL

        row_data = [
            v.plate_number,
            v.type.value if hasattr(v.type, "value") else str(v.type),
            f"{v.make} {v.model} ({v.year})",
            v.status.value if hasattr(v.status, "value") else str(v.status),
            round(total_dist, 2),
            round(duration_hours, 2),
            round(avg_speed, 1),
            round(max_speed, 1),
        ]

        for col_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = DATA_FONT
            cell.fill = row_fill
            cell.border = DATA_BORDER

            if col_idx in [1, 2, 4]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            elif col_idx in [5, 6, 7, 8]:
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

            if col_idx == 4:
                cell.font = STATUS_FONT_BOLD
                if val == "ACTIVE":
                    cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                elif val == "OFFLINE":
                    cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                elif val == "IDLE":
                    cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")

        ws.row_dimensions[row_idx].height = 20

    auto_fit_columns(ws)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    xlsx_bytes = output.getvalue()

    filename = f"trips_report_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
