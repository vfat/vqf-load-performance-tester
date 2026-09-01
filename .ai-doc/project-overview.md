# Project Overview: Lean Load Testing Platform & Two-Deck Control System

> **Status:** Fully Implemented & Delivered (Two-Deck Architecture)  
> **Design System:** VIP-1 Risograph Broadsheet ([.ai-doc/DESIGN.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/DESIGN.md))  
> **Default Port:** `2087` (Configurable via `PORT` env)  
> **Source:** MoM Brainstorming (`mom-2026-08-28`, `mom-2026-08-31-lean`, `mom-2026-09-01-separation-of-e2e-and-api-load-decks`)  
> **Last Updated:** 2026-09-01  

---

## 1. Problem Statement

Tim membutuhkan platform pengujian performa dan fungsional yang **ringan (*lightweight*)**, mandiri (*self-contained*), dan dilengkapi **Two-Deck Control System** visual yang interaktif:
1. **Two-Deck Web Dashboard Control**: Dua deck terpisah dengan antarmuka modern (Risograph Broadsheet UI):
   - **Deck 1: Playwright E2E Browser Studio** (Visual Step Builder, Live Process Viewport Mockup Frame, Realtime Step Timeline, Custom Headers & User-Agent).
   - **Deck 2: REST API Load Deck** (Multi-step API Chaining, Concurrent VU traffic generation, Live ApexCharts multi-series stream, 12-Metrics Summary Panel, Custom Headers & Auth token).
2. **Headless CLI Test Runner**: Script terminal mandiri (`npm run test:run`) untuk integrasi otomatisasi tanpa browser di **CI/CD Pipeline (GitHub Actions)**.
3. **Static Report Export**: Kemampuan mengekspor file mandiri `summary.json` dan `report.html` offline langsung dari antarmuka web.
4. **Zero-Infrastructure Overhead**: Tanpa Grafana, Prometheus, Redis, atau PostgreSQL. Seluruh data tersimpan rapi di SQLite lokal (`./data/test_history.db`).

---

## 2. Target Users & Stakeholders

* **QA / Test Engineers**: Memakai Two-Deck Web Dashboard untuk merancang skenario visual, memantau live viewport browser, dan mengecek grafik latensi realtime.
* **DevOps / CI Engineers**: Menggunakan mode headless CLI (`npm run test:run`) untuk automated pipeline gating & continuous regression.
* **Security & Pentest Engineers**: Memanfaatkan custom headers, custom User-Agent, dan autentikasi token untuk uji ketahanan endpoint & bypass testing.

---

## 3. Tech Stack & Design System

* **Frontend & Backend Server:** Native Node.js + TypeScript HTTP Server
* **Realtime Communication:** Server-Sent Events (SSE) via `/api/metrics/stream`
* **Testing Engines:** Playwright Chromium (`PlaywrightStepExecutor`) + Native Async Fetch Engine (`HttpLoadWorker` & `ApiChainingExecutor`)
* **Local Storage:** SQLite (`better-sqlite3` dengan WAL mode di `./data/test_history.db`)
* **Design Language:** VIP-1 Risograph Broadsheet Dashboard Kit (Warna: `#FAFAFA`, `#C7EEFF`, `#0077C0`, `#1D242B`)
* **Typography:** `Big Shoulders Display` + `Fraunces` + `JetBrains Mono`
* **Charts:** ApexCharts (Risograph Multi-Series Theme)

---

## 4. Dual-Mode Runtime Model

1. **Mode Interactive Web Dashboard:**  
   ```bash
   PORT=2087 npm start
   # Membuka Two-Deck Dashboard Control di http://localhost:2087
   ```
2. **Mode Headless CLI (CI/CD):**  
   ```bash
   npm run test:run -- --mode=api --url=https://httpbin.org/get --vus=20 --duration=10
   npm run test:run -- --mode=e2e --scenario=scenarios/e2e_flow.json
   # Berjalan langsung di terminal, mencetak live ticker, dan export summary.json
   ```

---

## 5. Prerequisite & Setup

1. Node.js LTS (v20+) & npm.
2. Playwright browser binaries (`npx playwright install --with-deps chromium`).
3. Build & Test: `npm run build && npm test`.

