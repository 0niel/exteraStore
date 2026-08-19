#!/bin/sh
set -eu

. "$(dirname "$0")/docker-cmd.sh"

IMAGE_REF=${1:?Image digest reference is required}
printf '%s\n' "$IMAGE_REF" | grep -Eq '^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$'

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
export DEPLOY_ROOT=$ROOT

STATE_DIR="$ROOT/.deploy-state"
mkdir -p "$STATE_DIR" 2>/dev/null || STATE_DIR="/tmp/exterastore-deploy-$$"
mkdir -p "$STATE_DIR"
CURRENT_IMAGE="$STATE_DIR/current-image"
PREVIOUS_IMAGE="$STATE_DIR/previous-image"
DEPLOY_LOCK="$STATE_DIR/.deploy-lock"

if ! mkdir "$DEPLOY_LOCK" 2>/dev/null; then
	echo "Another deployment is running" >&2
	exit 1
fi

cleanup() {
	rmdir "$DEPLOY_LOCK" 2>/dev/null || true
}
trap cleanup EXIT

test -f .env
chmod 600 .env 2>/dev/null || true

export APP_IMAGE=$IMAGE_REF
docker_cmd compose config --quiet
docker_cmd network inspect traefik-network >/dev/null 2>&1 || docker_cmd network create traefik-network >/dev/null
docker_cmd system prune -af --filter "until=72h" >/dev/null 2>&1 || true
docker_cmd pull "$APP_IMAGE"
docker_cmd compose up -d postgres redis traefik

ready=0
for attempt in $(seq 1 30); do
	if docker_cmd compose exec -T postgres sh -ec 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
		ready=1
		break
	fi
	sleep 2
done

if [ "$ready" -ne 1 ]; then
	echo "PostgreSQL did not become ready" >&2
	exit 1
fi

ready=0
for attempt in $(seq 1 30); do
	if [ "$(docker_cmd compose exec -T redis sh -ec 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping' 2>/dev/null)" = "PONG" ]; then
		ready=1
		break
	fi
	sleep 2
done

if [ "$ready" -ne 1 ]; then
	echo "Redis did not become ready" >&2
	exit 1
fi

./scripts/backup-db.sh
if ! docker_cmd compose --profile deploy run --rm migrate; then
	echo "Warning: migrations failed, continuing deploy (schema may already exist)" >&2
fi

OLD_IMAGE=
if [ -s "$CURRENT_IMAGE" ] && [ -r "$CURRENT_IMAGE" ]; then
	OLD_IMAGE=$(tr -d '\r\n' < "$CURRENT_IMAGE")
fi

if [ -n "$OLD_IMAGE" ] && [ "$OLD_IMAGE" != "$APP_IMAGE" ]; then
	printf '%s\n' "$OLD_IMAGE" > "$PREVIOUS_IMAGE"
	chmod 600 "$PREVIOUS_IMAGE" 2>/dev/null || true
fi

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
	if [ -n "$OLD_IMAGE" ]; then
		./scripts/rollback.sh "$OLD_IMAGE"
	fi
	echo "Application health check failed" >&2
	exit 1
fi

printf '%s\n' "$APP_IMAGE" > "$CURRENT_IMAGE"
chmod 600 "$CURRENT_IMAGE" 2>/dev/null || true
