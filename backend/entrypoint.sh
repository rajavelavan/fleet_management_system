#!/usr/bin/env bash
set -e

echo "Waiting for PostgreSQL to be ready..."
python3 - <<'EOF'
import socket
import time
import os

host = os.environ.get("POSTGRES_SERVER", "postgres")
port = int(os.environ.get("POSTGRES_PORT", 5432))

for i in range(30):
    try:
        with socket.create_connection((host, port), timeout=2):
            print(f"PostgreSQL port {port} on {host} is accepting connections.")
            break
    except OSError:
        time.sleep(1)
else:
    print("Warning: PostgreSQL did not become ready in time.")
EOF

echo "Running Alembic database migrations..."
alembic upgrade head

echo "Starting application with: $@"
exec "$@"
