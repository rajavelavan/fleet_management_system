#!/usr/bin/env bash
set -e

echo "Waiting for PostgreSQL to be ready..."
python3 - <<'EOF'
import socket
import time
import os
import urllib.parse

db_url = os.environ.get("DATABASE_URL")
if db_url:
    try:
        clean = db_url.replace("postgresql+asyncpg://", "http://").replace("postgresql://", "http://").replace("postgres://", "http://")
        p = urllib.parse.urlparse(clean)
        host = p.hostname or "postgres"
        port = p.port or 5432
    except Exception:
        host = os.environ.get("POSTGRES_SERVER", "postgres")
        port = int(os.environ.get("POSTGRES_PORT", 5432))
else:
    host = os.environ.get("POSTGRES_SERVER", "postgres")
    port = int(os.environ.get("POSTGRES_PORT", 5432))

for i in range(15):
    try:
        with socket.create_connection((host, port), timeout=2):
            print(f"PostgreSQL port {port} on {host} is accepting connections.")
            break
    except OSError:
        time.sleep(1)
else:
    print(f"Note: PostgreSQL connection probe timed out for {host}:{port}; proceeding with Alembic migrations.")
EOF

echo "Running Alembic database migrations..."
alembic upgrade head

# If PORT is set by cloud platform (e.g. Render / Heroku / Fly), map default 8000 to $PORT
if [ -n "$PORT" ]; then
    ADAPTED_ARGS=()
    for arg in "$@"; do
        if [ "$arg" = "8000" ]; then
            ADAPTED_ARGS+=("$PORT")
        else
            ADAPTED_ARGS+=("$arg")
        fi
    done
    echo "Starting application with dynamic PORT ($PORT): ${ADAPTED_ARGS[*]}"
    exec "${ADAPTED_ARGS[@]}"
fi

echo "Starting application with: $@"
exec "$@"
