#!/usr/bin/env bash
set -euo pipefail

<<<<<<< HEAD
CONTAINER_NAME="finally"
IMAGE_NAME="finally"
VOLUME_NAME="finally-data"
=======
CONTAINER_NAME="finally_agents"
IMAGE_NAME="finally_agents"
VOLUME_NAME="finally-data-agents"
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
PORT=8000

cd "$(dirname "$0")/.."

# Build if image doesn't exist or --build flag passed
if [[ "${1:-}" == "--build" ]] || ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
    echo "Building Docker image..."
    docker build -t "$IMAGE_NAME" .
fi

# Stop existing container if running
if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "Stopping existing container..."
    docker stop "$CONTAINER_NAME" >/dev/null
    docker rm "$CONTAINER_NAME" >/dev/null
fi

# Remove stopped container with same name
<<<<<<< HEAD
docker rm "$CONTAINER_NAME" 2>/dev/null || true
=======
if docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
    docker rm "$CONTAINER_NAME" >/dev/null
fi

# Check for .env file
ENV_FILE_ARG=""
if [[ -f .env ]]; then
    ENV_FILE_ARG="--env-file .env"
fi
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7

echo "Starting FinAlly..."
docker run -d \
    --name "$CONTAINER_NAME" \
<<<<<<< HEAD
    -v "$VOLUME_NAME":/app/db \
    -p "$PORT":"$PORT" \
    --env-file .env \
=======
    -p "$PORT:8000" \
    -v "$VOLUME_NAME:/app/db" \
    $ENV_FILE_ARG \
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
    "$IMAGE_NAME"

echo ""
echo "FinAlly is running at http://localhost:$PORT"
<<<<<<< HEAD
echo "Run scripts/stop_mac.sh to stop."

# Open browser (optional, non-fatal)
if command -v open &>/dev/null; then
    open "http://localhost:$PORT" 2>/dev/null || true
=======
echo ""

# Open browser if on macOS
if command -v open &>/dev/null; then
    open "http://localhost:$PORT"
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
fi
