# Deploying with Docker Compose and Traefik

Quinzy is a full-stack student self-assessment site with a Node.js API and an Nginx frontend. Docker serves both services on the internal
`proxy` and `internal` networks; Traefik terminates HTTPS and routes the public hostname to the Nginx frontend.
No host port is published by this application.

## Prerequisites

- Docker Engine with the Compose plugin installed on the server.
- A working Traefik instance connected to an external Docker network named
  `proxy`, with a `websecure` entrypoint and a `letsencrypt` certificate resolver.
- Ports 80 and 443 open to the internet on the Traefik host.
- A DNS record managed at your DNS provider.

## Deployment sequence

1. In your DNS provider, create an `A` record for the chosen hostname (for
   example, `quinzy.example.com`) pointing to the server's public IPv4 address.
   If the server has public IPv6, add a matching `AAAA` record. Wait until the
   record resolves publicly before starting the app; Let's Encrypt needs to
   reach the hostname.
2. On the server, create Traefik's shared network once (skip this if it already
   exists):

   ```bash
   docker network create proxy
   ```

3. Copy the project to the server, then create the deployment environment file:

   ```bash
   cp env.example .env
   ```

   Set `QUINZY_HOSTNAME` in `.env` to the exact DNS hostname. Do not include
   `https://`, a path, or a trailing slash.
   You must also set `GOOGLE_CLIENT_ID` for Google Authentication, and `JWT_SECRET` for secure sessions.
4. Start the service. The Docker build generates the lesson data from the
   Markdown sources, so Node.js is not required on the server:

   ```bash
   docker compose up -d --build
   ```

5. Check startup and HTTPS routing:

   ```bash
   docker compose ps
   docker compose logs -f quinzy
   ```

   Open `https://<your hostname>` after Traefik has issued the certificate.

## Updates

After changing content or site files, pull the latest Git commit and rebuild the
container:

```bash
git pull --ff-only origin main
docker compose up -d --build
```

The service remains internal to Docker. If it is unreachable, inspect the
Traefik logs and verify that Traefik is attached to the same `proxy` network.

## Automated updates after push

The clean flow is:

```text
local edit -> git commit -> git push -> GitHub Action SSHs to server -> server pulls and rebuilds
```

### 1. Prepare the server clone

Clone the repository into a stable path, for example:

```bash
sudo mkdir -p /opt/quinzy
sudo chown "$USER":"$USER" /opt/quinzy
git clone git@github.com:Hozyfa-Batisha/quinzy.git /opt/quinzy
cd /opt/quinzy
cp env.example .env
```

If the repository is private, add a GitHub deploy key or a server SSH key with
repository access before running `git clone`.

Edit `.env` and set `QUINZY_HOSTNAME` to your real domain. Also configure `GOOGLE_CLIENT_ID` and `JWT_SECRET`.

Run the first deployment manually:

```bash
sh scripts/deploy-server.sh
```

### 2. Add GitHub repository secrets

In GitHub, open the repository, then go to Settings -> Secrets and variables ->
Actions -> New repository secret.

Add these secrets:

- `SERVER_HOST`: your server IP address or SSH hostname.
- `SERVER_USER`: the Linux user that owns `/opt/quinzy`.
- `SERVER_SSH_KEY`: a private SSH key that can log in to the server.
- `SERVER_SSH_PORT`: optional, only needed if SSH is not on port `22`.
- `SERVER_APP_DIR`: optional, only needed if the app is not in `/opt/quinzy`.

### 3. Push to deploy

From your computer:

```bash
git add .
git commit -m "Update Quinzy"
git push origin main
```

Every push to `main` will run `.github/workflows/deploy.yml`. The workflow logs
will show the SSH connection, `git pull`, Docker rebuild, and container status.

The server-side script refuses to deploy if the server clone has uncommitted
changes. This keeps the server as a deployment target only; all edits should be
made locally and pushed through Git.
