# Deployment

## Topology

The production stack keeps application dependencies private and exposes only the HTTPS reverse proxy.

```text
Internet ──HTTPS──> Caddy ──> 127.0.0.1:3002 ──> application
                                                     ├──> PostgreSQL
                                                     └──> n8n ──> Gemini

SSH tunnel only ──> 127.0.0.1:5678 ──> n8n editor
```

PostgreSQL and the internal Docker network have no published ports. The application and n8n bind only to host loopback.

## Configuration

Clone the repository into a directory chosen by the operator, then create the private environment file:

```bash
cp .env.example .env
```

Generate strong, distinct values for:

- `N8N_ENCRYPTION_KEY`
- `CASE_DB_PASSWORD`
- `OPERATOR_KEY`

Keep protected recovery copies. Losing or changing the n8n encryption key makes stored credentials unreadable. Never reuse secrets across environments or commit `.env`.

## Start

```bash
sudo docker compose config --quiet
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs --tail=100 app n8n postgres
curl -fsS http://127.0.0.1:3002/healthz
```

## Configure n8n privately

Open an SSH tunnel from the administrator workstation:

```bash
ssh -L 5678:127.0.0.1:5678 USER@HOST
```

Open `http://127.0.0.1:5678`, complete the owner setup, import `workflows/triage-request-ai.json`, assign the Gemini credential, test the workflow, and publish it. Confirm its production path is `/webhook/operations-desk-triage-ai`.

Do not expose port 5678 publicly. The application reaches the production webhook through the private Compose network.

## Caddy

Replace the placeholder hostname:

```caddyfile
operations.example.com {
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

Apply rate limiting in the provider firewall or with a compatible Caddy module. Validate configuration before reloading:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl -fsS https://operations.example.com/healthz
```

## Updates

```bash
git pull --ff-only
sudo docker compose config --quiet
sudo docker compose up -d --build
sudo docker compose ps
curl -fsS http://127.0.0.1:3002/healthz
```

Export material n8n workflow changes into `workflows/` before updating containers. Never export credentials into the repository.

## Backup

Back up n8n state and PostgreSQL cases together with the matching secrets:

```bash
sudo docker compose stop n8n
sudo tar -czf /secure-backups/operations-n8n-$(date +%F-%H%M).tgz .n8n
sudo docker compose start n8n
sudo docker compose exec -T postgres sh -c 'exec pg_dump -U operations_desk -d operations_desk' > /secure-backups/operations-cases-$(date +%F-%H%M).sql
test -s "$(ls -t /secure-backups/operations-cases-*.sql | head -1)"
```

Treat backups as sensitive. Test restoration in an isolated environment before relying on it.

## Verification

1. The public `/healthz` endpoint reports application and database readiness.
2. A sample request creates a persisted case.
3. n8n execution history contains the corresponding workflow execution.
4. A review-required case appears in the operator queue.
5. Approval or rejection succeeds once; a second decision returns HTTP 409.
6. Stopping n8n makes triage fail without generating a local result.
