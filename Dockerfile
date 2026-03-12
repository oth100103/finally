<<<<<<< HEAD
# Stage 1: Build frontend static export
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Python backend + serve static files
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app/backend

# Copy backend and install dependencies
COPY backend/pyproject.toml backend/uv.lock* ./
RUN touch README.md
RUN uv sync --no-dev --no-editable

# Copy backend source
COPY backend/app app/

# Copy frontend build output to static/
COPY --from=frontend-build /app/frontend/out static/

# Create db directory
RUN mkdir -p /app/db

ENV FINALLY_DB_PATH=/app/db/finally.db

EXPOSE 8000

CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
=======
# Stage 1: Build Next.js static export
FROM node:20-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + static frontend
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app/backend

# Install Python dependencies (README.md needed by hatchling build)
COPY backend/pyproject.toml backend/uv.lock backend/README.md ./
RUN uv sync --frozen --no-dev

# Copy backend source
COPY backend/ ./

# Copy frontend static build output
COPY --from=frontend-build /app/frontend/out ./static/

# Create db directory for SQLite volume mount
RUN mkdir -p /app/db

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
