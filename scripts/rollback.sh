#!/bin/sh
set -eu

. "$(dirname "$0")/docker-cmd.sh"

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
export DEPLOY_ROOT=$ROOT

STATE_DIR="$ROOT/.deploy-state"
CURRENT_IMAGE="$STATE_DIR/current-image"
PREVIOUS_IMAGE="$STATE_DIR/previous-image"

IMAGE_REF=${1:-}
if [ -z "$IMAGE_REF" ] && [ -s "$PREVIOUS_IMAGE" ] && [ -r "$PREVIOUS_IMAGE" ]; then
	IMAGE_REF=$(tr -d '\r\n' < "$PREVIOUS_IMAGE")
fi

test -n "$IMAGE_REF"
printf '%s\n' "$IMAGE_REF" | grep -Eq '^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$'

export APP_IMAGE=$IMAGE_REF
docker_cmd pull "$APP_IMAGE"
docker_cmd compose config --quiet
docker_cmd compose up -d --no-deps app

healthy=0
for attempt in $(seq 1 60); do
	CONTAINER_ID=$(docker_cmd compose ps -q app)
	if [ -n "$CONTAINER_ID" ]; then
		STATUS=$(docker_cmd inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER_ID")
		if [ "$STATUS" = "healthy" ]; then
			healthy=1
			break
		fi
		if [ "$STATUS" = "unhealthy" ] || [ "$STATUS" = "exited" ] || [ "$STATUS" = "dead" ]; then
			break
		fi
	fi
	sleep 3
done

if [ "$healthy" -ne 1 ]; then
	echo "Rollback health check failed" >&2
	exit 1
fi

docker_cmd compose up -d --no-deps translation-worker

mkdir -p "$STATE_DIR" 2>/dev/null || true
printf '%s\n' "$APP_IMAGE" > "$CURRENT_IMAGE"
chmod 600 "$CURRENT_IMAGE" 2>/dev/null || true
