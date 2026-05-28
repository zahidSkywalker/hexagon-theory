# HexaGon Theory — Backend API

Crowdsourced intelligence platform backend built with **FastAPI** + **MongoDB** (Motor async driver).

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Copy env and fill in secrets
cp .env.example .env

# Run dev server
uvicorn app.main:app --reload
```

The API docs are available at `http://localhost:8000/docs`.

## Tech Stack

- **FastAPI** — async web framework
- **MongoDB (Motor)** — async Python driver
- **Pydantic v2** — data validation & settings
- **python-jose** — JWT tokens (HS256)
- **passlib / bcrypt** — password hashing
- **slowapi** — rate limiting

## API Endpoints

| Group | Prefix | Description |
|-------|--------|-------------|
| Auth | `/api/auth` | Register, login, current user |
| Users | `/api/users` | Public profiles, update own |
| Ideas | `/api/ideas` | CRUD, search, file upload, versions |
| Votes | `/api/ideas/{id}/votes` | Upvote / downvote / summary |
| Comments | `/api/ideas/{id}/comments` | Threaded comment tree |
| Institutional | `/api/institutional` | Institutional interest & dashboard |

## Deployment

### Docker

```bash
docker build -t hexagon-backend .
docker run -p 8000:8000 --env-file .env hexagon-backend
```

### Render

Push to a Git repo connected to Render. The included `render.yaml` handles build & start commands automatically. Set `MONGODB_URI` as a secret environment variable.

## Project Structure

```
app/
├── main.py          # FastAPI app, lifespan, index creation
├── config.py        # Pydantic Settings
├── database.py      # Motor client
├── dependencies.py  # Auth dependencies
├── models/          # MongoDB document models (Pydantic validation)
├── schemas/         # Request / response schemas
├── routers/         # Route handlers
├── services/        # File upload service
└── utils/           # Security, slugify helpers
```

## License

MIT
