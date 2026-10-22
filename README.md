# Real-Time Logistics & Fleet Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4-green?logo=postgis&logoColor=white)](https://postgis.net/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Ruff](https://img.shields.io/badge/code%20style-ruff-261230.svg?logo=ruff&logoColor=white)](https://github.com/astral-sh/ruff)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

A production-grade, event-driven real-time logistics and fleet management platform designed for low-latency vehicle telemetry tracking, spatial dispatching, and dynamic route monitoring.

---

## Architecture Overview

```
                        +----------------------------+
                        |   React + Vite + TS (UI)   |
                        |      (Port 5173)           |
                        +--------------+-------------+
                                       |
                                       | HTTP / REST (Axios)
                                       v
                        +----------------------------+
                        |    FastAPI Backend API     |
                        |  (App Factory / Port 8000) |
                        +------+--------------+------+
                               |              |
                   SQLAlchemy  |              | Redis Async
                 (asyncpg)     |              | (Pub/Sub & Cache)
                               v              v
      +-----------------------------+    +-----------------------------+
      |    PostgreSQL 16 + PostGIS   |    |           Redis 7           |
      |   Spatial Database (5432)   |    |    In-Memory Broker (6379)  |
      +-----------------------------+    +-----------------------------+
```

### Component Topology

| Service | Technology | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend API** | FastAPI, Python 3.11, Pydantic v2, SQLAlchemy 2.0 (asyncpg) | `8000` | Core API, App Factory pattern, geospatial data pipelines, live reload |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Axios | `5173` | Real-time operations dashboard, vehicle telemetry visualization |
| **Spatial Database** | PostgreSQL 16 + PostGIS 3.4 (`postgis/postgis:16-3.4`) | `5432` | Relational storage with spatial indexing (`GEOMETRY`, `GEOGRAPHY`) |
| **Cache & Pub/Sub** | Redis 7 Alpine (`redis:7-alpine`) | `6379` | Fast state cache, vehicle ping deduplication, live stream pub/sub |

---

## Monorepo Layout

```
.
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 0001_enable_postgis.py # Initial PostGIS extension migration
│   │   ├── env.py                     # Async SQLAlchemy 2.0 Alembic runner
│   │   └── script.py.mako             # GeoAlchemy2 migration template
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   └── health.py      # Health check endpoint (DB + Redis pings)
│   │   │       └── router.py          # API v1 consolidated router
│   │   ├── config.py                  # Pydantic Settings & environment validation
│   │   ├── database.py                # Async engine & sessionmaker (SQLAlchemy 2.0)
│   │   ├── main.py                    # App Factory (`create_app`) & CORS setup
│   │   └── models/                    # Declarative base & ORM models
│   ├── alembic.ini                    # Alembic configuration
│   ├── Dockerfile                     # Python 3.11 container with health check
│   ├── entrypoint.sh                  # Migration auto-runner & uvicorn launcher
│   ├── pyproject.toml                 # Ruff lint/format configuration & metadata
│   └── requirements.txt               # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts              # Axios instance configured with VITE_API_BASE_URL
│   │   ├── components/                # Modular UI components
│   │   ├── App.tsx                    # Operations dashboard & status monitor
│   │   ├── main.tsx                   # React root entrypoint
│   │   └── index.css                  # Tailwind CSS root directives
│   ├── Dockerfile                     # Node 20 container with Vite dev server
│   ├── package.json                   # Frontend dependencies & scripts
│   ├── tailwind.config.js             # Tailwind design system configuration
│   ├── tsconfig.json                  # Strict TypeScript configuration
│   └── vite.config.ts                 # Vite server & reverse proxy configuration
├── docker-compose.yml                 # 4-container orchestration topology
├── .env.example                       # Environment template
├── .gitignore                         # Project-wide ignore rules
└── README.md                          # Documentation
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+ or later) with Docker Compose v2.
- (Optional for host development) Python 3.11+, Node.js 20+, and npm.

### Quickstart with Docker Compose

1. **Clone the repository and copy environment settings**:
   ```bash
   cp .env.example .env
   ```

2. **Launch all 4 containers**:
   ```bash
   docker compose up --build
   ```

   To run in the background (detached mode):
   ```bash
   docker compose up -d --build
   ```

3. **Verify running services**:
   ```bash
   docker compose ps
   ```

4. **Access the Applications**:
   - **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
   - **Backend API Root**: [http://localhost:8000](http://localhost:8000)
   - **API Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
   - **Interactive Swagger Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
   - **ReDoc Documentation**: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)

---

## Health Check Endpoint Specification

### `GET /api/v1/health`

**Sample Response (`200 OK`)**:
```json
{
  "status": "ok",
  "service": "Fleet & Logistics Management System",
  "version": "0.1.0",
  "environment": "development",
  "components": {
    "database": {
      "status": "healthy",
      "postgis_version": "3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1"
    },
    "redis": {
      "status": "healthy"
    }
  }
}
```

---

## Database & PostGIS Migrations

Database migrations are powered by **Alembic** using an async engine connection.

1. **Automatic execution**:
   The backend container runs `alembic upgrade head` automatically on container boot via `entrypoint.sh`.

2. **Run migrations manually inside container**:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

3. **Create a new migration**:
   ```bash
   docker compose exec backend alembic revision -m "create_fleet_vehicles_table"
   ```

4. **Rollback migration**:
   ```bash
   docker compose exec backend alembic downgrade -1
   ```

5. **Verify PostGIS Extension**:
   ```bash
   docker compose exec postgres psql -U postgres -d fleet_db -c "SELECT postgis_full_version();"
   ```

---

## Code Quality & Standards

### Python Standards (Ruff)

This repository standardizes strictly on **[Ruff](https://github.com/astral-sh/ruff)** for both linting and formatting (**do NOT use Black**).

Configuration is stored in `backend/pyproject.toml`.

- **Run linter**:
  ```bash
  docker compose exec backend ruff check .
  ```
  *(Or locally inside `/backend`: `ruff check .`)*

- **Auto-fix lint errors**:
  ```bash
  docker compose exec backend ruff check --fix .
  ```

- **Format code**:
  ```bash
  docker compose exec backend ruff format .
  ```

- **Check formatting without altering files**:
  ```bash
  docker compose exec backend ruff format --check .
  ```

### TypeScript / Frontend Standards

- **Typecheck**:
  ```bash
  docker compose exec frontend npm run lint
  ```
  *(Or locally inside `/frontend`: `npm run lint`)*

- **Production Build**:
  ```bash
  docker compose exec frontend npm run build
  ```

---

## Development Workflow & Live Reload

Both backend and frontend services have host volumes mounted:
- **Backend changes**: Files edited in `./backend` trigger instant Uvicorn hot-reload inside `fleet_backend`.
- **Frontend changes**: Files edited in `./frontend` trigger instant Vite Hot Module Replacement (HMR) inside `fleet_frontend`.

---

## Sprint 1: Secure Authentication & Role-Based Access Control (RBAC)

### Technical Stack & Architecture
- **JWT Provider**: `PyJWT` (RFC 7519 compliant). Short-lived (15 min) Bearer access tokens.
- **Refresh Strategy**: 7-day long-lived tokens securely bound in `HttpOnly`, `SameSite=Lax` cookies.
- **Password Hashing**: Direct `bcrypt` with rounds=12 (strictly no `python-jose` or `passlib` for Python 3.12+ compatibility).
- **Client State**: Zustand `authStore` persisting user profile and role, with Axios interceptors managing automatic 401 token refreshing and request retries.

### Test Personas & Credentials

| Role | Email | Password | Allowed Scopes |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@fleet.local` | `AdminPassword123!` | Full system administration, `/admin` route, admin-only & dispatcher endpoints |
| **DISPATCHER** | `dispatcher@fleet.local` | `DispatcherPassword123!` | Fleet dispatching, dispatcher endpoints, general operations |
| **DRIVER** | `driver@fleet.local` | `DriverPassword123!` | Vehicle telemetry terminal, `/driver` route |

### Authentication API Endpoints

| Method | Endpoint | Description | Auth / Security |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate with email/password; returns short-lived access token and sets HttpOnly refresh cookie | Public |
| `POST` | `/api/v1/auth/refresh` | Reads refresh token from cookie and issues fresh short-lived access token | HttpOnly Cookie |
| `POST` | `/api/v1/auth/logout` | Clears HttpOnly refresh token cookie | Session |
| `GET` | `/api/v1/auth/me` | Fetches current user profile and role claims | Bearer Token |
| `GET` | `/api/v1/auth/admin-only` | Protected endpoint requiring `require_admin` dependency | Bearer (`ADMIN`) |
| `GET` | `/api/v1/auth/dispatcher-only` | Protected endpoint requiring `require_dispatcher` dependency | Bearer (`ADMIN`, `DISPATCHER`) |

### Running Backend Unit & RBAC Tests

```bash
docker compose exec -e PYTHONPATH=/app backend pytest -v
```

