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
