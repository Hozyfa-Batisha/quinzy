# Deploying with Docker Compose and Traefik

Quinzy is a static student self-assessment site. Docker serves it with Nginx on the internal
`proxy` network; Traefik terminates HTTPS and routes the public hostname to it.
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
4. Build the lesson data if you changed the Markdown sources, then start the
   service:

   ```bash
   npm run build
   docker compose up -d --build
   ```

5. Check startup and HTTPS routing:

   ```bash
   docker compose ps
   docker compose logs -f quinzy
   ```

   Open `https://<your hostname>` after Traefik has issued the certificate.

## Updates

After changing content or site files, rebuild and replace the container:

```bash
npm run build
docker compose up -d --build
```

The service remains internal to Docker. If it is unreachable, inspect the
Traefik logs and verify that Traefik is attached to the same `proxy` network.
