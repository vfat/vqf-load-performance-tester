# Constitution for `minilab/pentest`

## Purpose

This constitution defines the rules and guidelines for documentation and planning in this repository.

## 1. Workspace Rules

- Documentation work lives in `.ai-doc/`.
- The documentation workspace contains:
  - a progress tracker: `3p.md`
  - this constitution: `constitution.md`
  - brainstorming & personas
  - generated documentation artifacts
- Derived artifacts (DCD, ERD, REST API spec, C4 diagrams, etc.) are created ONLY upon explicit user request.

## 2. Progress Tracking (3P)

- Maintain `.ai-doc/3p.md`.
- `3p.md` must be read before continuing documentation work.
- `3p.md` must be updated after each meaningful step.
- `3p.md` uses three standard sections:
  - `Progress`
  - `Plan`
  - `Pending`

## 3. Evidence Rules

- Every meaningful claim must be traceable to actual code, config, or verified discussion.
- Do not document from filenames alone.
- When evidence is weak or unverified, label clearly as `Draft`, `Partial`, `Placeholder`, `Asumsi`, or `Perlu Dikonfirmasi`.

## 4. Architecture & Object Classification

- `Actor`: External user, system, or persona triggering interactions.
- `Boundary`: UI, CLI, gateway, or entry surfaces.
- `Control`: Orchestrator, runner workers, test handlers, services, and managers.
- `Entity`: Schemas, contracts, metrics, test results, config, and REST API endpoints.
- `Infrastructure`: K8s/Docker daemon, Redis queue, PostgreSQL/TimescaleDB, Prometheus/Grafana.

## 5. TDD Policy

- **TDD Policy:** `Enabled`
- **Scope:** Greenfield Lean Testing Platform & Single Dashboard Control
- **Activated At:** `2026-08-31`
- **Control Plane:** `.ai-doc/tdd-overview.md`
- **Rule:** Tidak ada production code untuk behavior baru sebelum test yang sesuai ditulis dan diverifikasi gagal (`RED`).

