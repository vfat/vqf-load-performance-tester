# Project Overview: Lean Load Testing Platform & Single Dashboard Control

> **Status:** Greenfield Planning (Lean SvelteKit Architecture)  
> **Design System:** VIP-1 Risograph Broadsheet ([.ai-doc/DESIGN.md](file:///home/ubuntu/workspace/minilab/pentest/.ai-doc/DESIGN.md))  
> **Source:** MoM Brainstorming (`mom-2026-08-28`, `mom-2026-08-31-lean`, `mom-2026-08-31-dashboard`)  
> **Tanggal:** 2026-08-31  

---

## 1. Problem Statement

Tim membutuhkan platform pengujian performa dan fungsional yang **ringan (*lightweight*)**, mandiri (*self-contained*), dan dilengkapi **Single Dashboard Control** visual yang interaktif:
1. **Single Web Dashboard Control**: Satu antarmuka web modern (SvelteKit + Risograph Broadsheet UI) untuk memicu pengujian, menghentikan pengujian (*emergency abort*), memantau grafik telemetry realtime via SSE, dan memeriksa riwayat error/screenshot.
2. **Load & E2E Testing Terintegrasi**: Menggabungkan Playwright (browser E2E) dan Artillery (HTTP load) dalam satu backend Node.js terpadu dengan *safe-concurrency throttling*.
3. **Zero-Infrastructure Overhead**: Tanpa Grafana, Prometheus, Redis, atau PostgreSQL. Seluruh data tersimpan rapi di SQLite lokal (`history.db`).

---

## 2. Target Users & Stakeholders

* **QA / Test Engineers**: Memakai Web Dashboard untuk menjalankan dan memantau skenario pengujian secara visual.
* **DevOps / CI Engineers**: Menggunakan mode headless CLI (`test-runner run`) untuk automated pipeline gating.
* **Developers / Leads**: Memeriksa visual report dan kegagalan screenshot Playwright langsung di Web UI.

---

## 3. Tech Stack & Design System

* **Frontend & Backend Server:** Svelte / SvelteKit dengan `@sveltejs/adapter-node`
* **Realtime Communication:** Server-Sent Events (SSE) via `/api/metrics/stream`
* **Testing Engines:** Playwright (Chromium/Firefox) + Artillery Engine
* **Local Storage:** SQLite (`better-sqlite3` dengan WAL mode)
* **Design Language:** VIP-1 Risograph Broadsheet Dashboard Kit (Warna: `#FAFAFA`, `#C7EEFF`, `#0077C0`, `#1D242B`)
* **Typography:** `Big Shoulders Display` + `Fraunces` + `JetBrains Mono`
* **Charts:** ApexCharts (Risograph Solid Grid Theme)

---

## 4. Dual-Mode Runtime Model

1. **Mode Interactive Web Dashboard:**  
   ```bash
   npm run dashboard
   # Membuka Single Dashboard Control di http://localhost:3000
   ```
2. **Mode Headless CLI (CI/CD):**  
   ```bash
   npm run test:run -- --scenario=checkout --type=hybrid --concurrency=10
   # Berjalan langsung di terminal, mencetak live ticker, dan export summary.json
   ```

---

## 5. Prerequisite & Setup

1. Node.js LTS (v20+) & npm.
2. Playwright browser binaries (`npx playwright install --with-deps chromium`).
