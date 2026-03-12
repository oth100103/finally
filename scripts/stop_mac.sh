#!/usr/bin/env bash
set -euo pipefail

<<<<<<< HEAD
CONTAINER_NAME="finally"
=======
CONTAINER_NAME="finally_agents"
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7

if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "Stopping FinAlly..."
    docker stop "$CONTAINER_NAME" >/dev/null
    docker rm "$CONTAINER_NAME" >/dev/null
<<<<<<< HEAD
    echo "Stopped. Data volume preserved."
else
    echo "FinAlly is not running."
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
=======
    echo "FinAlly stopped."
elif docker ps -aq -f name="$CONTAINER_NAME" | grep -q .; then
    echo "Removing stopped container..."
    docker rm "$CONTAINER_NAME" >/dev/null
    echo "Done."
else
    echo "FinAlly is not running."
>>>>>>> cf41801d4655da3edb3b665d86c9a0a1fc9384d7
fi
