# Netcup deployment beside Ticketing

## Topology

AI Operations Desk runs as an independent stack on the same host as Ticketing. It has its own PostgreSQL database and n8n state. The products share Caddy as the public TLS boundary but do not share databases, Docker networks, credentials, or application APIs.

```text
Internet ──HTTPS──> Caddy
                     ├── Ticketing hostname ──> 127.0.0.1:3001
                     └── Operations hostname ─> 127.0.0.1:3002 ──> app ──> n8n
                                                                  └────> PostgreSQL

SSH tunnel only ──> 127.0.0.1:5678 ──> n8n editor
```

The application calls n8n over its private Compose network. The n8n editor and webhook do not need public exposure.

## Initial installation

Choose the final HTTPS hostname before editing Caddy. The examples use `operations.example.test`; replace it everywhere.

```bash
cd /srv/projects
git clone https://github.com/Hernan-dh/ai_operations_desk.git
cd ai_operations_desk
cp .env.example .env
```

Generate strong, distinct values for `N8N_ENCRYPTION_KEY`, `CASE_DB_PASSWORD`, and `OPERATOR_KEY` and place them in `.env`. Keep protected recovery copies: losing or changing the n8n key makes stored credentials unreadable. Do not reuse Ticketing secrets and do not use the local-development defaults on Netcup.

Start the private stack:

```bash
sudo docker compose config --quiet
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs --tail=100 app n8n postgres
curl -fsS http://127.0.0.1:3002/healthz
```

Compose binds the application to `127.0.0.1:3002` and n8n to `127.0.0.1:5678`. Ticketing keeps `127.0.0.1:3001`.

## Configure n8n privately

From the administrator workstation, open an SSH tunnel:

```bash
ssh -L 5678:127.0.0.1:5678 SERVER_USER@SERVER_HOST
```

While the tunnel is open:

1. Open `http://127.0.0.1:5678` locally.
2. Complete the n8n owner setup.
3. Import `workflows/triage-request-ai.json`.
4. Create the Google Gemini credential and assign it to **Gemini classifier**.
5. Test and publish the workflow; confirm `/webhook/operations-desk-triage-ai`.

Do not expose port 5678 in the Netcup firewall. The application reaches the production webhook internally at `http://n8n:5678`.

## Caddy

Add a separate site block without changing the Ticketing block:

```caddyfile
operations.example.test {
    encode zstd gzip
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
    reverse_proxy 127.0.0.1:3002
}
```

Enforce rate limiting in the provider firewall or with a compatible Caddy module. Validate and reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -fsS https://operations.example.test/healthz
```

## Updates

```bash
cd /srv/projects/ai_operations_desk
git pull --ff-only
sudo docker compose config --quiet
sudo docker compose up -d --build app n8n
sudo docker compose ps
curl -fsS http://127.0.0.1:3002/healthz
```

Export material n8n workflow changes into `workflows/` before updating containers. Never export credentials into the repository.

## Backup and recovery

The `.n8n` directory contains workflow state, users, execution metadata, and encrypted credentials. PostgreSQL contains all cases and decisions. Back up both together with the matching secrets:

```bash
cd /srv/projects/ai_operations_desk
sudo docker compose stop n8n
sudo tar -C /srv/projects/ai_operations_desk -czf /srv/backups/ai-operations-n8n-$(date +%F-%H%M).tgz .n8n
sudo docker compose start n8n
sudo docker compose exec -T postgres sh -c 'exec pg_dump -U operations_desk -d operations_desk' > /srv/backups/ai-operations-cases-$(date +%F-%H%M).sql
test -s "$(ls -t /srv/backups/ai-operations-cases-*.sql | head -1)"
```

Treat both backups as sensitive and test restoration outside production. To restore the case database, stop the application, restore a verified dump into an empty `operations_desk` database, and only then restart the application. Never test restoration against production.

## Verification

1. `https://operations.example.test/healthz` returns `{"status":"ok"}`.
2. The three sample requests produce a rendered case.
3. n8n execution history shows each corresponding execution.
4. The result engine is `gemini-with-deterministic-policy-v1` when Gemini succeeds.
5. A review-required case appears in the operator queue and can be approved or rejected once.
6. A second decision on the same case returns HTTP 409.
7. Stopping n8n makes triage fail without generating a local result.
8. Ticketing remains healthy at its hostname and on `127.0.0.1:3001`.
