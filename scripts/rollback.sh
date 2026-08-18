#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
export DEPLOY_ROOT=$ROOT

IMAGE_REF=${1:-}
if [ -z "$IMAGE_REF" ] && [ -s .previous-image ]; then
	IMAGE_REF=$(tr -d '\r\n' < .previous-image)
fi

test -n "$IMAGE_REF"
printf '%s\n' "$IMAGE_REF" | grep -Eq '^ghcr\.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$'

export APP_IMAGE=$IMAGE_REF
docker pull "$APP_IMAGE"
docker compose config --quiet
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
	echo "Rollback health check failed" >&2
	exit 1
fi

printf '%s\n' "$APP_IMAGE" > .current-image
chmod 600 .current-image
