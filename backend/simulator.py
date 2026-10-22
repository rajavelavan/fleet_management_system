"""Standalone Road-Aware GPS Simulator.

Simulates real-world vehicles moving along pre-seeded highway and arterial road
corridors (e.g. US-101 SF Bay corridor, I-880 East Bay freight artery,
I-80 Bay Bridge to Sacramento corridor, and CA-92 San Mateo Cross-Bay).
Sends realistic GPS pings every 3 seconds to the telemetry ingestion API,
ensuring trucks stay on actual roadways instead of cutting through buildings.
"""

import argparse
import asyncio
import logging
import math
import random
import time
from datetime import UTC, datetime
from typing import Any

import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("simulator")

# Realistic road coordinates (Lat, Lng) sampled along real highway centerlines
ROAD_ROUTES: dict[str, list[tuple[float, float]]] = {
    # Route 1: US-101 Southbound (San Francisco downtown through SFO to San Jose)
    "US-101-Bay-Corridor": [
        (37.7749, -122.4194),  # SF Civic Center
        (37.7652, -122.4065),  # 101 at Potrero Ave
        (37.7505, -122.4042),  # 101 near Cesar Chavez
        (37.7315, -122.4044),  # 101 Silver Ave
        (37.7088, -122.4053),  # 101 near Brisbane
        (37.6749, -122.3995),  # 101 Oyster Point
        (37.6534, -122.4072),  # 101 South San Francisco
        (37.6213, -122.3790),  # 101 San Francisco Int'l Airport (SFO)
        (37.5956, -122.3612),  # 101 Burlingame
        (37.5630, -122.3255),  # 101 San Mateo
        (37.5312, -122.2874),  # 101 Belmont
        (37.5026, -122.2514),  # 101 San Carlos
        (37.4852, -122.2285),  # 101 Redwood City
        (37.4528, -122.1852),  # 101 Menlo Park
        (37.4372, -122.1384),  # 101 Palo Alto
        (37.4085, -122.0782),  # 101 Mountain View
        (37.3820, -122.0234),  # 101 Sunnyvale
        (37.3685, -121.9421),  # 101 Santa Clara
        (37.3541, -121.8943),  # 101 San Jose North
        (37.3382, -121.8863),  # 101 San Jose Downtown
    ],
    # Route 2: I-880 Freight Corridor (Port of Oakland South to Fremont & Milpitas)
    "I-880-East-Bay-Freight": [
        (37.8044, -122.2711),  # Port of Oakland / 7th St
        (37.7915, -122.2612),  # I-880 near Lake Merritt
        (37.7712, -122.2354),  # I-880 23rd Ave
        (37.7541, -122.2032),  # I-880 High St
        (37.7342, -122.1812),  # I-880 Oakland Coliseum / 66th
        (37.7125, -122.1554),  # I-880 San Leandro Marina
        (37.6852, -122.1287),  # I-880 Washington Ave
        (37.6582, -122.1021),  # I-880 San Lorenzo
        (37.6321, -122.0743),  # I-880 Hayward / Winton Ave
        (37.6041, -122.0521),  # I-880 Hayward / Whipple Rd
        (37.5752, -122.0312),  # I-880 Union City / Alvarado
        (37.5482, -122.0084),  # I-880 Fremont Blvd
        (37.5184, -121.9852),  # I-880 Auto Mall Pkwy
        (37.4851, -121.9542),  # I-880 Fremont South
        (37.4521, -121.9281),  # I-880 Dixon Landing / Milpitas
        (37.4241, -121.9054),  # I-880 Great Mall Milpitas
    ],
    # Route 3: I-80 Bay Bridge to Vallejo / Sacramento Freight Run
    "I-80-East-Corridor": [
        (37.7885, -122.3912),  # SF Bay Bridge Western Anchorage
        (37.8082, -122.3734),  # Yerba Buena Island
        (37.8241, -122.3412),  # Bay Bridge Toll Plaza
        (37.8452, -122.2985),  # I-80 Emeryville / Powell St
        (37.8681, -122.3021),  # I-80 Berkeley / University Ave
        (37.8894, -122.3082),  # I-80 Albany / Buchanan St
        (37.9152, -122.3214),  # I-80 El Cerrito / Central Ave
        (37.9421, -122.3385),  # I-80 Richmond / Cutting Blvd
        (37.9712, -122.3341),  # I-80 San Pablo Dam Rd
        (38.0054, -122.3045),  # I-80 Pinole
        (38.0352, -122.2612),  # I-80 Hercules / CA-4
        (38.0621, -122.2285),  # Carquinez Bridge
        (38.0984, -122.2421),  # I-80 Vallejo / Curtola Pkwy
    ],
    # Route 4: CA-92 San Mateo Cross-Bay Route (Half Moon Bay to Hayward)
    "CA-92-Cross-Bay": [
        (37.4635, -122.4286),  # CA-92 Half Moon Bay / Main St
        (37.4884, -122.3812),  # CA-92 Skyline Blvd Ridge
        (37.5182, -122.3415),  # CA-92 Crystal Springs Reservoir
        (37.5451, -122.3124),  # CA-92 San Mateo / Alameda de las Pulgas
        (37.5582, -122.2795),  # CA-92 / US-101 Interchange
        (37.5754, -122.2452),  # San Mateo Bridge West Approach (Foster City)
        (37.6012, -122.1854),  # San Mateo Bridge Mid-Span High Rise
        (37.6251, -122.1284),  # San Mateo Bridge East Approach
        (37.6384, -122.0945),  # CA-92 Hayward / Clawiter Rd
        (37.6521, -122.0712),  # CA-92 Hayward / I-880 Interchange
    ],
}


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate compass heading/bearing in degrees (0-360) between two coordinates."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing_rad = math.atan2(y, x)
    bearing_deg = (math.degrees(bearing_rad) + 360) % 360
    return round(bearing_deg, 1)


class VehicleSimulator:
    """Simulates realistic continuous movement along an interpolated road corridor."""

    def __init__(self, vehicle_id: str, plate_number: str, route_name: str, waypoints: list[tuple[float, float]]):
        self.vehicle_id = vehicle_id
        self.plate_number = plate_number
        self.route_name = route_name
        self.waypoints = waypoints
        self.current_idx = 0
        self.progress = 0.0  # Fraction between current waypoint and next
        self.direction = 1   # 1 for forward, -1 for reverse loop
        # Realistic highway truck speeds: 55 to 75 km/h with subtle fluctuations
        self.base_speed = random.uniform(58.0, 78.0)
        self.current_speed = self.base_speed
        self.altitude = random.uniform(15.0, 45.0)

    def step(self) -> dict[str, Any]:
        """Compute the next position along the highway segment."""
        p1 = self.waypoints[self.current_idx]
        next_idx = self.current_idx + self.direction

        # Handle route boundary reversal
        if next_idx >= len(self.waypoints):
            self.direction = -1
            next_idx = self.current_idx - 1
        elif next_idx < 0:
            self.direction = 1
            next_idx = self.current_idx + 1

        p2 = self.waypoints[next_idx]

        # Interpolate location between p1 and p2
        # Progress steps by ~0.15 to 0.25 every 3 seconds for continuous smooth cruising
        step_increment = random.uniform(0.12, 0.22)
        self.progress += step_increment

        if self.progress >= 1.0:
            self.progress = 0.0
            self.current_idx = next_idx
            p1 = self.waypoints[self.current_idx]
            next_next = self.current_idx + self.direction
            if next_next >= len(self.waypoints):
                self.direction = -1
                next_next = self.current_idx - 1
            elif next_next < 0:
                self.direction = 1
                next_next = self.current_idx + 1
            p2 = self.waypoints[next_next]

        lat = p1[0] + (p2[0] - p1[0]) * self.progress
        lng = p1[1] + (p2[1] - p1[1]) * self.progress

        heading = calculate_bearing(p1[0], p1[1], p2[0], p2[1])

        # Realistic speed jitter (+/- 3 km/h)
        self.current_speed = max(20.0, round(self.base_speed + random.uniform(-3.5, 3.5), 1))
        # GPS horizontal accuracy typical of commercial GPS units (1.5 - 4.5m)
        accuracy = round(random.uniform(1.8, 3.8), 1)
        self.altitude = round(self.altitude + random.uniform(-0.5, 0.5), 1)

        return {
            "vehicle_id": self.vehicle_id,
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "speed": self.current_speed,
            "heading": heading,
            "altitude": self.altitude,
            "accuracy": accuracy,
            "recorded_at": datetime.now(UTC).isoformat(),
        }


async def fetch_available_vehicles(api_base: str) -> list[dict[str, Any]]:
    """Fetch active vehicles from backend API using credentials or direct DB fallback."""
    # 1. Try DB directly if inside backend environment
    try:
        from sqlalchemy import select

        from app.database import AsyncSessionLocal
        from app.models.vehicle import Vehicle

        async with AsyncSessionLocal() as db:
            stmt = select(Vehicle).where(Vehicle.deleted_at.is_(None))
            res = await db.execute(stmt)
            vehicles = res.scalars().all()
            if vehicles:
                return [
                    {
                        "id": str(v.id),
                        "plate_number": v.plate_number,
                        "status": v.status.value if hasattr(v.status, "value") else str(v.status),
                    }
                    for v in vehicles
                ]
    except Exception:
        pass

    # 2. Try logging in as dispatcher to query /vehicles
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            login_resp = await client.post(
                f"{api_base}/auth/login",
                data={"username": "dispatcher@fleet.local", "password": "password123"},
            )
            headers = {}
            if login_resp.status_code == 200:
                token = login_resp.json().get("access_token")
                headers = {"Authorization": f"Bearer {token}"}

            resp = await client.get(f"{api_base}/vehicles?limit=100", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("items", [])
            logger.warning(f"Failed to fetch vehicles from API (status {resp.status_code}): {resp.text}")
        except Exception as e:
            logger.warning(f"Could not connect to vehicles API: {e}")
    return []


async def run_simulator(
    api_base: str,
    ping_interval: float = 3.0,
    max_pings: int | None = None,
    vehicle_ids: list[str] | None = None,
):
    """Run simulator loop sending road-aware GPS pings."""
    ingest_url = f"{api_base}/tracking/ingest"
    logger.info(f"Connecting to telemetry ingestion endpoint: {ingest_url}")

    # 1. Obtain vehicles
    sim_vehicles = []
    vehicles_data = await fetch_available_vehicles(api_base)
    active_vehicles = [v for v in vehicles_data if v.get("status") in ("ACTIVE", "IDLE")]

    if vehicle_ids:
        # Use user-specified IDs
        for vid in vehicle_ids:
            sim_vehicles.append({"id": vid, "plate_number": f"SIM-{vid[:8]}"})
    elif active_vehicles:
        sim_vehicles = active_vehicles
    else:
        logger.error("No active vehicles found in database or specified via --vehicles.")
        logger.error("Please ensure vehicles are present in PostgreSQL.")
        return

    logger.info(f"Initialized simulation for {len(sim_vehicles)} vehicle(s).")

    # 2. Assign each vehicle a road corridor
    simulators: list[VehicleSimulator] = []
    route_keys = list(ROAD_ROUTES.keys())
    for i, v in enumerate(sim_vehicles):
        route_name = route_keys[i % len(route_keys)]
        sim = VehicleSimulator(
            vehicle_id=str(v["id"]),
            plate_number=v.get("plate_number", "UNKNOWN"),
            route_name=route_name,
            waypoints=ROAD_ROUTES[route_name],
        )
        simulators.append(sim)
        logger.info(
            f"  -> Vehicle [{sim.plate_number}] (UUID: {sim.vehicle_id}) assigned route: {sim.route_name}"
        )

    # 3. Streaming loop
    ping_count = 0
    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            ping_count += 1
            t_start = time.perf_counter()

            # Generate and send pings for all vehicles concurrently
            current_cycle = ping_count

            async def send_ping(sim: VehicleSimulator, cycle_num: int = current_cycle):
                payload = sim.step()
                try:
                    resp = await client.post(ingest_url, json=payload)
                    if resp.status_code == 201:
                        logger.info(
                            f"📡 [PING #{cycle_num}] {sim.plate_number} @ ({payload['latitude']:.4f}, {payload['longitude']:.4f}) | "
                            f"{payload['speed']} km/h, {payload['heading']}° on {sim.route_name}"
                        )
                    else:
                        logger.warning(
                            f"⚠️ Ingest rejected for {sim.plate_number} (status {resp.status_code}): {resp.text}"
                        )
                except Exception as err:
                    logger.error(f"❌ Error sending telemetry ping for {sim.plate_number}: {err}")

            await asyncio.gather(*(send_ping(sim, current_cycle) for sim in simulators))

            if max_pings and ping_count >= max_pings:
                logger.info(f"Completed requested {max_pings} simulation pings.")
                break

            # Sleep remaining interval to guarantee precise 3-second cycle
            elapsed = time.perf_counter() - t_start
            sleep_time = max(0.0, ping_interval - elapsed)
            await asyncio.sleep(sleep_time)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Road-Aware GPS Telemetry Simulator for Fleet Logistics"
    )
    parser.add_argument(
        "--api",
        type=str,
        default="http://127.0.0.1:8000/api/v1",
        help="Base URL for Fleet API v1 (default: http://127.0.0.1:8000/api/v1)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=3.0,
        help="Interval in seconds between GPS pings (default: 3.0)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=None,
        help="Total number of ping cycles to run (default: infinite)",
    )
    parser.add_argument(
        "--vehicles",
        nargs="*",
        default=None,
        help="Specific vehicle UUIDs to simulate (optional)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        asyncio.run(
            run_simulator(
                api_base=args.api,
                ping_interval=args.interval,
                max_pings=args.count,
                vehicle_ids=args.vehicles,
            )
        )
    except KeyboardInterrupt:
        logger.info("Simulator stopped by user.")
