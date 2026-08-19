#!/bin/sh
set -eu

. "$(dirname "$0")/docker-cmd.sh"

ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$ROOT"
export DEPLOY_ROOT=$ROOT

if [ -z "${APP_IMAGE:-}" ] && [ -s .current-image ]; then
	APP_IMAGE=$(tr -d '\r\n' < .current-image)
	export APP_IMAGE
fi

BACKUP_DIR=${BACKUP_DIR:-"$ROOT/backups"}
if ! mkdir -p "$BACKUP_DIR" 2>/dev/null || [ ! -w "$BACKUP_DIR" ]; then
	BACKUP_DIR="$ROOT/.backups"
	mkdir -p "$BACKUP_DIR" 2>/dev/null || true
fi
if [ ! -w "$BACKUP_DIR" ]; then
	echo "Warning: skipping postgres backup (no write access)" >&2
	exit 0
fi
chmod 700 "$BACKUP_DIR" 2>/dev/null || true
umask 077

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FINAL="$BACKUP_DIR/postgres-$TIMESTAMP.dump"
TEMP=$(mktemp "$BACKUP_DIR/.postgres-$TIMESTAMP.XXXXXX")

cleanup() {
	rm -f "$TEMP"
}
trap cleanup EXIT

docker_cmd compose exec -T postgres sh -ec 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --format=custom --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$TEMP"
test -s "$TEMP"
mv "$TEMP" "$FINAL"
chmod 600 "$FINAL"
find "$BACKUP_DIR" -type f -name 'postgres-*.dump' -mtime +14 -delete
printf '%s\n' "$FINAL"
