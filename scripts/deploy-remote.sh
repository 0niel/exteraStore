#!/bin/sh
set -eu

IMAGE_REF=${1:?Image digest reference is required}
printf '%s\n' "$IMAGE_REF" | grep -Eq '^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$'

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
export DEPLOY_ROOT=$ROOT

if ! mkdir .deploy-lock 2>/dev/null; then
	echo "Another deployment is running" >&2
	exit 1
fi

cleanup() {
	rmdir .deploy-lock
}
trap cleanup EXIT

test -f .env
chmod 600 .env

export APP_IMAGE=$IMAGE_REF
docker compose config --quiet
docker network inspect traefik-network >/dev/null 2>&1 || docker network create traefik-network >/dev/null
docker pull "$APP_IMAGE"
docker compose up -d postgres redis traefik

ready=0
for attempt in $(seq 1 30); do
	if docker compose exec -T postgres sh -ec 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
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
	if [ "$(docker compose exec -T redis sh -ec 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping' 2>/dev/null)" = "PONG" ]; then
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
docker compose --profile deploy run --rm migrate

OLD_IMAGE=
if [ -s .current-image ]; then
	OLD_IMAGE=$(tr -d '\r\n' < .current-image)
fi

if [ -n "$OLD_IMAGE" ] && [ "$OLD_IMAGE" != "$APP_IMAGE" ]; then
	printf '%s\n' "$OLD_IMAGE" > .previous-image
fi

docker compose up -d --no-deps app

healthy=0
for attempt in $(seq 1 60); do
	CONTAINER_ID=$(docker compose ps -q app)
	if [ -n "$CONTAINER_ID" ]; then
		STATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CONTAINER_ID")
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

printf '%s\n' "$APP_IMAGE" > .current-image
chmod 600 .current-image
