# Production deployment

Deploy starts only after `CI` succeeds for a push to `main`. CI runs Biome, TypeScript, the Next.js build, a Docker build, dependency and filesystem audits, and a container scan. Deploy builds the tested commit, scans the published GHCR image, and uses an immutable `ghcr.io/owner/repository@sha256:...` reference.

The server receives only Compose, Traefik, Prometheus configuration, and deployment scripts. It does not need the Git repository, source files, Node.js, pnpm, or a Dockerfile.

## GitHub environment and secrets

Create a protected GitHub environment named `production` and add:

- `SERVER_HOST`: `46.21.246.210`.
- `SERVER_PORT`: SSH port, normally `22`.
- `SERVER_USER`: `oniel`.
- `SSH_PRIVATE_KEY`: complete private OpenSSH deployment key.
- `SSH_KNOWN_HOSTS`: independently verified host-key entry for this host and port.
- `GHCR_USERNAME`: GitHub user or machine user with package read access.
- `GHCR_READ_TOKEN`: token with only the package read permission needed for this GHCR package.
- `HEALTHCHECK_URL`: `https://exterastore.app/api/health`.

Repository Actions permissions must allow package writes. Grant this repository Actions access to its GHCR package. The workflow-provided `GITHUB_TOKEN` is used only to publish; the server uses `GHCR_READ_TOKEN` only to pull.

## Deployment SSH key and Termius

To reuse a Termius key, open **Keychain**, select the key used for `oniel@46.21.246.210`, and export its private key in OpenSSH/PEM format. Save it to `~/.ssh/exterastore_github_actions`, preserve the BEGIN/END lines, and run:

```sh
chmod 600 ~/.ssh/exterastore_github_actions
ssh -o BatchMode=yes -i ~/.ssh/exterastore_github_actions oniel@46.21.246.210
gh secret set SSH_PRIVATE_KEY --env production < ~/.ssh/exterastore_github_actions
```

If Termius cannot export the private key, generate a dedicated deployment key:

Generate a dedicated key on a trusted machine:

```sh
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/exterastore_github_actions -C github-actions-deploy
```

In a Termius terminal connected as `SERVER_USER`, install the generated public key:

```sh
install -d -m 700 ~/.ssh && printf '%s\n' 'ssh-ed25519 REPLACE_WITH_PUBLIC_KEY github-actions-deploy' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
```

Put the complete private key into `SSH_PRIVATE_KEY`. Do not reuse a personal key.

Collect the host key:

```sh
ssh-keyscan -p 22 -t ed25519 46.21.246.210 > exterastore_known_hosts
ssh-keygen -lf exterastore_known_hosts
```

Compare the fingerprint with the value read directly in Termius:

```sh
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Only after they match, put the complete `exterastore_known_hosts` content into `SSH_KNOWN_HOSTS`. Use the configured port instead of `22` when applicable. `ssh-keyscan` output alone is not authenticated.

```sh
gh secret set SSH_KNOWN_HOSTS --env production < exterastore_known_hosts
gh secret set SERVER_HOST --env production --body '46.21.246.210'
gh secret set SERVER_PORT --env production --body '22'
gh secret set SERVER_USER --env production --body 'oniel'
gh secret set GHCR_USERNAME --env production
gh secret set GHCR_READ_TOKEN --env production
gh secret set HEALTHCHECK_URL --env production --body 'https://exterastore.app/api/health'
```

## First-time server setup

Connect and install Docker Engine and the Docker Compose v2 plugin from Docker's official Ubuntu repository:

```sh
ssh -i ~/.ssh/exterastore_github_actions oniel@46.21.246.210
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg openssl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
exit
ssh -i ~/.ssh/exterastore_github_actions oniel@46.21.246.210
docker version
docker compose version
```

Create persistent directories and ACME storage:

```sh
mkdir -p ~/exterastore/traefik/acme ~/exterastore/scripts ~/exterastore/monitoring ~/exterastore/backups
chmod 700 ~/exterastore ~/exterastore/backups
touch ~/exterastore/traefik/acme/acme.json
chmod 600 ~/exterastore/traefik/acme/acme.json
docker network inspect traefik-network >/dev/null 2>&1 || docker network create traefik-network
```

Generate production secrets:

```sh
POSTGRES_PASSWORD=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
AUTH_SECRET=$(openssl rand -hex 32)
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
GRAFANA_PASSWORD=$(openssl rand -hex 32)
```

Create `~/exterastore/.env` and fill every required application value:

```sh
umask 077
cat > ~/exterastore/.env <<EOF
DEPLOY_ROOT=/home/oniel/exterastore
POSTGRES_DB=extera_plugins
POSTGRES_USER=extera_user
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
DATABASE_URL=postgresql://extera_user:$POSTGRES_PASSWORD@postgres:5432/extera_plugins
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
AUTH_SECRET=$AUTH_SECRET
NEXTAUTH_URL=https://exterastore.app
TELEGRAM_BOT_TOKEN=REPLACE_WITH_VALUE
TELEGRAM_BOT_USERNAME=REPLACE_WITH_VALUE
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=REPLACE_WITH_VALUE
TELEGRAM_API_BASE_URL=https://tg-proxy.controlisanillusion08.workers.dev
TELEGRAM_WEBHOOK_SECRET=$TELEGRAM_WEBHOOK_SECRET
CRON_SECRET=$CRON_SECRET
YANDEX_STORAGE_ACCESS_KEY=REPLACE_WITH_VALUE
YANDEX_STORAGE_SECRET_KEY=REPLACE_WITH_VALUE
YANDEX_STORAGE_BUCKET=REPLACE_WITH_VALUE
YANDEX_STORAGE_REGION=ru-central1
OPENROUTER_API_KEY=REPLACE_WITH_VALUE
OPENROUTER_MODEL=google/gemini-3.6-flash
UPLOADTHING_SECRET=
UPLOADTHING_APP_ID=
YANDEX_CAPTCHA_SECRET_KEY=REPLACE_WITH_VALUE
NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY=REPLACE_WITH_VALUE
INITIAL_ADMINS=i_am_oniel
NEXT_PUBLIC_INITIAL_ADMINS=
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
EOF
chmod 600 ~/exterastore/.env
nano ~/exterastore/.env
```

The generated hexadecimal PostgreSQL password is URL-safe. If another password format is used, URL-encode it in `DATABASE_URL`.

There are no default production passwords. PostgreSQL and Redis have no published host ports. Redis remains on the internal application network and its authenticated health check uses `REDISCLI_AUTH`. Traefik exposes only `80` and `443`; insecure dashboard access and public port `8080` are disabled. Optional Prometheus binds only to `127.0.0.1:9090`.

## Deployment and rollback behavior

Each deployment:

1. Checks out the exact commit that passed CI.
2. Publishes and scans its GHCR image.
3. Passes the registry digest, never a mutable tag, to Compose.
4. Starts or updates infrastructure without `docker compose down`.
5. Retries PostgreSQL and Redis readiness checks.
6. Creates a custom-format PostgreSQL backup before migration.
7. Runs `drizzle-kit migrate` using committed, journaled SQL migrations.
8. Recreates only the application service.
9. Retries container and public HTTPS health checks.
10. Restores the previous application digest automatically on a health failure.

Backups are mode `600` files in `~/exterastore/backups`; local files older than 14 days are removed. Replicate them to independent storage according to the required recovery objective.

Manual application rollback:

```sh
cd ~/exterastore
./scripts/rollback.sh
```

The first deployment has no previous image. If it fails, there is no application revision to restore; infrastructure and any existing database remain available.

## Versioned migration policy

Generate migrations with:

```sh
pnpm db:generate
```

Commit each SQL migration together with `drizzle/meta/_journal.json` and its snapshot. CI rejects SQL files missing from the journal and journal entries missing their SQL file. Production never runs `drizzle-kit push`.

Use expand/migrate/contract:

- Add compatible tables, nullable columns, and indexes first.
- Deploy code that supports both schema versions.
- Backfill separately when work can be long-running.
- Remove or rename old schema only after old application images no longer depend on it.

Automatic rollback changes only the application digest; it never reverses a successful database migration. Backward compatibility with the previous image is therefore mandatory.

## Database restore

Restore only during a planned incident because it discards post-backup writes. Stop application writes, select the intended dump, then run:

```sh
cd ~/exterastore
export APP_IMAGE=$(tr -d '\r\n' < .current-image)
export DEPLOY_ROOT=$PWD
docker compose stop app
docker compose exec -T postgres sh -ec 'PGPASSWORD="$POSTGRES_PASSWORD" dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T postgres sh -ec 'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T postgres sh -ec 'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/postgres-YYYYMMDDTHHMMSSZ.dump
docker compose up -d --no-deps app
```
