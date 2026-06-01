# Employee System — Backend API

FastAPI backend for a multi-tenant employee management platform. It exposes REST endpoints for authentication, users, projects, attendance, leave, time tracking, announcements, notifications, workflows, and role-based access control (RBAC).

## Tech Stack

- **Framework:** [FastAPI](https://fastapi.tiangolo.com/)
- **Server:** Uvicorn
- **ORM:** SQLAlchemy
- **Migrations:** Alembic
- **Database:** PostgreSQL
- **Auth:** JWT (Supabase-compatible secret / local tokens)
- **Package manager:** [uv](https://docs.astral.sh/uv/) (recommended)

## Prerequisites

- Python **3.14+** (see `.python-version`)
- PostgreSQL database
- Optional: Redis (Celery background tasks), SendGrid, Stripe, AWS S3, OpenAI, Firebase (see `.env.example`)

## Project Structure

```
backend/
├── alembic/              # Database migrations
├── src/
│   ├── main.py           # FastAPI app entry point
│   ├── api/              # Route handlers
│   ├── config/           # Settings (pydantic-settings)
│   ├── core/             # Celery app
│   ├── database/         # SQLAlchemy engine & session
│   ├── models/           # ORM models
│   ├── schemas/          # Pydantic request/response schemas
│   └── services/         # Business logic
├── seed.py               # Seed default tenant & admin user
├── seed_projects.py      # Seed sample projects
├── pyproject.toml
└── .env.example
```

## Setup

### 1. Install dependencies

From the `backend` directory:

```bash
uv sync
```

Or with pip:

```bash
pip install -e .
```

### 2. Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Required for local development:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_JWT_SECRET` | Secret used to sign/verify JWT tokens |
| `FRONTEND_URL` | Frontend origin (e.g. `http://localhost:3000`) |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins (JSON array) |

See `.env.example` for optional integrations (Redis, SendGrid, Stripe, S3, OpenAI, Firebase).

### 3. Database migrations

Run migrations from the `backend` directory:

```bash
alembic upgrade head
```

To create a new migration after model changes:

```bash
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

### 4. Seed data (optional)

Creates a default tenant and admin user (`admin@example.com` / `admin123`):

```bash
uv run python seed.py
```

For sample projects:

```bash
uv run python seed_projects.py
```

## Running the Server

```bash
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Or:

```bash
uv run python -m src.main
```

| URL | Description |
|-----|-------------|
| http://localhost:8000 | API root |
| http://localhost:8000/health | Health check |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/redoc | ReDoc |

API routes are mounted under `/api/v1`.

## API Overview

| Prefix | Tag | Description |
|--------|-----|-------------|
| `/api/v1/auth` | Auth | Login and token handling |
| `/api/v1/users` | Users | User management |
| `/api/v1/projects` | Projects | Project CRUD |
| `/api/v1/employee-projects` | Employee Projects | Employee–project assignments |
| `/api/v1/attendance` | Attendance | Check-in / attendance records |
| `/api/v1/leave` | Leave | Leave requests |
| `/api/v1/time-tracking` | Time Tracking | Time logs |
| `/api/v1/dashboard` | Dashboard | Dashboard aggregates |
| `/api/v1/announcements` | Announcements | Company announcements |
| `/api/v1/notifications` | Notifications | User notifications |
| `/api/v1/workflows` | Workflows | Approval workflows |
| `/api/v1/rbac` | RBAC | Roles and permissions |

Additional modules (tasks, payments, files, chat, AI) exist under `src/api/` but are not registered in `main.py` by default.

## Development Notes

- Settings are loaded from `.env` via `src/config/settings.py`.
- Request logging middleware records method, path, status, and duration.
- On startup, `Base.metadata.create_all()` ensures tables exist; prefer **Alembic** for schema changes in shared environments.
- Celery worker entry point: `src/worker.py` (requires Redis).

## License

Part of the employee-project monorepo. See the repository root for license details.
