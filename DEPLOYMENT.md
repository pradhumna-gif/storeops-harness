# Deployment

## Target
**Local Docker** (the minimum accepted option), using `Dockerfile` and `docker-compose.yml`, on Docker Desktop 4.91 with the WSL2 backend (Windows 11). The container was built and run with `docker compose up --build -d`, reached `healthy`, and served the new endpoint (see `evidence/19` and `evidence/20`). A plain Node run is documented as the fallback.

## Configuration decisions
| Concern | Decision |
|---|---|
| Image | Multi-stage `node:20-alpine`. The build stage runs `npm ci && npm run build` (`tsconfig.build.json` → `dist/server.js`). The runtime stage installs production dependencies only |
| Port | `PORT` env var, default 3000, published as `3000:3000` |
| Health | `GET /health` → `{"status":"UP"}`, used by the Docker `HEALTHCHECK` |
| User | runs as the unprivileged `node` user |
| Secrets | none needed. The capstone is in-memory with header-based identity. In a real deployment, the `x-user-id` header would be replaced by a verified token, with secrets injected as env vars or from a secrets manager and never baked into the image |
| State | in-memory, so a container restart resets it to the seed data (`task-1..3`). This is acceptable under architecture rule 6 |

**Build fix found during deployment:** `npm run build` originally used `tsconfig.json` (`rootDir: "."`), which emitted `dist/src/server.js`. The Dockerfile's `CMD node dist/server.js` would therefore fail. Added `tsconfig.build.json` (`rootDir: "src"`). Verified: `npm run build` → `dist/server.js` exists, and `node dist/server.js` serves requests.

## Steps: Docker
```bash
docker compose up --build -d
docker compose ps                      # storeops-api   Up (healthy)   0.0.0.0:3000->3000/tcp
curl http://localhost:3000/health
curl -X PATCH http://localhost:3000/api/activities/bulk-status \
  -H "Content-Type: application/json" -H "x-user-id: associate-1" \
  -d '{"ids":["task-1","task-2","missing"],"status":"BLOCKED"}'
curl -H "x-user-id: lead-1" http://localhost:3000/api/alerts
docker compose down
```
PowerShell equivalent for the PATCH call:
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/activities/bulk-status -Method PATCH -ContentType application/json -Headers @{"x-user-id"="associate-1"} -Body '{"ids":["task-1","task-2","missing"],"status":"BLOCKED"}' | ConvertTo-Json -Depth 5
```

## Steps: local Node (fallback)
```bash
npm ci
npm run verify
npm run build
npm start          # node dist/server.js
```

## Evidence
| File | Shows |
|---|---|
| `evidence/16_BULK_STATUS_ENDPOINT.png` | Screenshot: running app, `PATCH /api/activities/bulk-status` with `task-1` in `updated` and `missing` in `failed` (`ACTIVITY_NOT_FOUND`) |
| `evidence/18_LOCAL_RUN_LOG.txt` | Captured output from the built server (`node dist/server.js`): `/health` UP; a bulk request with one authorized, one forbidden and one missing ID → `updated:["task-1"]`, failures `FORBIDDEN` and `ACTIVITY_NOT_FOUND`; then `GET /api/alerts` for `lead-1` shows the `SHIFT_HANDOVER` alert delivered through EventBus; an invalid status → HTTP 400 |
| `evidence/21_LOCAL_BUILD_BULK_STATUS.png` | Screenshot: the **built** artefact (`node dist/server.js`, the same file the Docker image runs). The bulk request returns `updated:["task-1"]` with `FORBIDDEN` and `ACTIVITY_NOT_FOUND` failures, and `GET /api/alerts` for `lead-1` shows the `SHIFT_HANDOVER` alert raised through EventBus |
| `evidence/19_DOCKER_PS.png` | **Docker (Docker 29.8.0, Docker Desktop 4.91 with WSL2):** `docker compose ps` shows `storeops-api  storeops-harness:latest  Up (healthy)  0.0.0.0:3000->3000/tcp`, the container log `StoreOps listening on port 3000`, and `/health` → `UP` |
| `evidence/20_DOCKER_BULK_STATUS.png` | **Docker:** the harness-generated endpoint answered by the container. `updated: [task-1]`; `task-2 FORBIDDEN` and `missing ACTIVITY_NOT_FOUND`; `GET /api/activities/task-1` shows status `BLOCKED` persisted; `GET /api/alerts` for `lead-1` shows the `SHIFT_HANDOVER` alert delivered through EventBus; status `TODO` → `HTTP 400 INVALID_BULK_STATUS` |

Screenshots are taken with `scripts/capture-evidence.ps1`. It opens a real console window, runs the commands, and captures that window.

No live cloud URL is claimed.
