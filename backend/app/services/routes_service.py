import math
from typing import Any

import httpx

from app.config import settings


def _encode_coordinate(val: float) -> str:
    """Encode a single coordinate component using Google's polyline algorithm."""
    num = int(round(val * 1e5))
    num = ~(num << 1) if num < 0 else (num << 1)
    chunks = []
    while num >= 0x20:
        chunks.append(chr((0x20 | (num & 0x1F)) + 63))
        num >>= 5
    chunks.append(chr(num + 63))
    return "".join(chunks)


def encode_polyline(points: list[tuple[float, float]]) -> str:
    """Encode a list of (latitude, longitude) tuples into an encoded polyline string."""
    result = []
    prev_lat = 0
    prev_lng = 0
    for lat, lng in points:
        lat_int = int(round(lat * 1e5))
        lng_int = int(round(lng * 1e5))
        d_lat = lat_int - prev_lat
        d_lng = lng_int - prev_lng
        result.append(_encode_coordinate(d_lat / 1e5))
        result.append(_encode_coordinate(d_lng / 1e5))
        prev_lat = lat_int
        prev_lng = lng_int
    return "".join(result)


def decode_polyline(polyline_str: str) -> list[tuple[float, float]]:
    """Decode an encoded polyline string into a list of (latitude, longitude) tuples."""
    index = 0
    lat = 0
    lng = 0
    coordinates: list[tuple[float, float]] = []
    length = len(polyline_str)
    while index < length:
        # Latitude delta
        b = 0
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += dlat

        # Longitude delta
        shift = 0
        result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += dlng

        coordinates.append((lat / 1e5, lng / 1e5))
    return coordinates


def generate_fallback_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> dict[str, Any]:
    """
    Generate an intelligent synthetic route if Google Routes API key is not configured or network fails.
    Interpolates waypoints with slight urban-like deviations and computes Haversine distance and ETA.
    """
    steps = 10
    points: list[tuple[float, float]] = []
    for i in range(steps + 1):
        ratio = i / float(steps)
        # S-curve interpolation + subtle curve
        wiggle = 0.002 * math.sin(ratio * math.pi)
        p_lat = origin_lat + (dest_lat - origin_lat) * ratio + wiggle
        p_lng = origin_lng + (dest_lng - origin_lng) * ratio - (wiggle * 0.5)
        points.append((round(p_lat, 6), round(p_lng, 6)))

    # Compute straight-line / Manhattan approximation distance in km
    dlat = math.radians(dest_lat - origin_lat)
    dlng = math.radians(dest_lng - origin_lng)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(origin_lat))
        * math.cos(math.radians(dest_lat))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance_km = round(6371.0 * c * 1.25, 2)  # road winding factor 1.25
    distance_meters = int(distance_km * 1000)

    # Average urban/suburban logistics vehicle speed ~35 km/h
    duration_mins = max(1, int(round((distance_km / 35.0) * 60)))
    duration_seconds = duration_mins * 60

    encoded_polyline = encode_polyline(points)

    return {
        "encoded_polyline": encoded_polyline,
        "distance_meters": distance_meters,
        "duration_seconds": duration_seconds,
        "duration_formatted": f"{duration_mins} mins",
        "polyline_points": [{"lat": p[0], "lng": p[1]} for p in points],
        "is_fallback": True,
    }


async def calculate_google_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> dict[str, Any]:
    """
    Call Google Routes API (v2 Compute Routes).
    Falls back gracefully to high-precision synthetic routing if key is missing or request fails.
    """
    api_key = settings.GOOGLE_MAPS_API_KEY
    if not api_key or api_key == "mock_key":
        return generate_fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)

    url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": (
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
        ),
    }
    payload = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": origin_lat,
                    "longitude": origin_lng,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": dest_lat,
                    "longitude": dest_lng,
                }
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": False,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            if response.status_code == 200:
                data = response.json()
                routes = data.get("routes", [])
                if routes:
                    primary_route = routes[0]
                    encoded_polyline = (
                        primary_route.get("polyline", {}).get("encodedPolyline", "")
                    )
                    distance_meters = primary_route.get("distanceMeters", 0)
                    duration_str = primary_route.get("duration", "0s")
                    duration_seconds = int(
                        float(duration_str.rstrip("s"))
                        if duration_str.endswith("s")
                        else 0
                    )
                    duration_mins = max(1, int(round(duration_seconds / 60)))

                    decoded = (
                        decode_polyline(encoded_polyline)
                        if encoded_polyline
                        else []
                    )
                    points = [{"lat": p[0], "lng": p[1]} for p in decoded]

                    return {
                        "encoded_polyline": encoded_polyline,
                        "distance_meters": distance_meters,
                        "duration_seconds": duration_seconds,
                        "duration_formatted": f"{duration_mins} mins",
                        "polyline_points": points,
                        "is_fallback": False,
                    }
    except Exception:
        # Network error or Google Routes timeout -> fallback
        pass

    return generate_fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)
