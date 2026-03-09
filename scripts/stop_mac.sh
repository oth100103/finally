#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="finally"

if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
    echo "Stopping FinAlly..."
    docker stop "$CONTAINER_NAME" >/dev/null
    docker rm "$CONTAINER_NAME" >/dev/null
    echo "Stopped. Data volume preserved."
else
    echo "FinAlly is not running."
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
fi
