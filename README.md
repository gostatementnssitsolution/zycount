# Zycount — Modern Intelligent Accounting & Business OS

Zycount is a Malaysia-oriented **financial operating system**: every business transaction
automatically produces the correct accounting impact while remaining traceable back to its
source document.

```
SOURCE DOCUMENT -> BUSINESS TRANSACTION -> ACCOUNTING POSTING -> JOURNAL -> GENERAL LEDGER -> FINANCIAL REPORT
```

## Status

**Phase 0 — Foundation.** This repository currently contains:

- The full **engineering specification** in [`docs/spec/`](docs/spec/) (the source of truth for the build).
- A **runnable monorepo skeleton** (empty web + API shells, Prisma schema, local infra).

Feature development follows the phased roadmap in
[`docs/spec/16-phase-roadmap-and-launch-checklist.md`](docs/spec/16-phase-roadmap-and-launch-checklist.md).

## Tech stack

| Layer | Choice |
|---|---|
| Web | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Recharts |
| API | NestJS + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache / jobs | Redis + BullMQ |
| Object storage | S3-compatible (MinIO locally) |
| Local infra | Docker Compose |
| Monorepo | pnpm workspaces + Turborepo |

Everything above is open-source and free to run locally or self-host.

## Repository layout

```
zycount/
├─ apps/
│  ├─ web/          # Next.js frontend (shell + sidebar)
│  └─ api/          # NestJS backend (health + module skeleton)
├─ packages/
│  ├─ db/           # Prisma schema + migrations
│  └─ shared/       # shared TypeScript types / DTOs
├─ docs/spec/       # the engineering specification (start here)
├─ infra/           # docker-compose for postgres + redis + minio
├─ turbo.json
└─ pnpm-workspace.yaml
```

## Getting started (local)

Prerequisites: **Node 20+**, **pnpm 9+**, **Docker Desktop**.

```bash
# 1. install dependencies
pnpm install

# 2. start local infrastructure (Postgres, Redis, MinIO)
docker compose -f infra/docker-compose.yml up -d

# 3. copy environment file and adjust if needed
cp .env.example .env

# 4. apply the database schema
pnpm --filter @zycount/db prisma:migrate

# 5. run web + api in dev mode
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/health
- MinIO console: http://localhost:9001

## Documentation

Read the spec in order — [`docs/spec/00-overview.md`](docs/spec/00-overview.md) first.
