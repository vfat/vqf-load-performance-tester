# SCD-01-Test-Orchestrator

> **Status:** Active / Enhanced (Two-Deck Model)  
> **Target Component:** Test Orchestrator & Execution Engine (`src/lib/server/engine.ts`, `src/lib/server/scheduler.ts`)  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Test Orchestrator adalah komponen sentral (*Control Plane*) yang memproses dispatching untuk dua jalur pengujian yang terpisah secara tegas:
1. **Jalur 1 (Playwright E2E Deck):** Mengorkestrasi eksekusi skenario browser headless DOM (Single URL Hit atau Multi-Step Form/Click Action Steps) dengan pelaporan screenshot visual.
2. **Jalur 2 (REST API Load Deck):** Mengorkestrasi pengujian beban HTTP asinkron dan otomatisasi REST API berantai (*API Chaining*) dengan Virtual Users (1–100 VUs) dan load profiles.

Posisi dalam sistem:
* Menerima request dari Dashboard Web UI (Tab E2E Studio atau Tab API Load Deck) atau CI/CD Pipeline.
* Mengatur antrean in-memory dengan concurrency throttle (`TaskScheduler`).
* Mendelegasikan eksekusi secara terpisah ke `PlaywrightRunner` (untuk E2E) atau `HttpLoadWorker` (untuk API Load).
* Mencatat hasil ke SQLite `test_runs` / `test_executions` dan menyiarkan event status via SSE `TelemetryStreamer`.

---

## 2. Scope

### In-Scope:
* Penerimaan konfigurasi pengujian dari Deck 1 (`PLAYWRIGHT_ONLY` / E2E Steps) dan Deck 2 (`ARTILLERY_ONLY` / API Chaining).
* Pembuatan ID unik untuk setiap sesi test run (`test_run_id`).
* Pengelolaan siklus hidup test run (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `ABORTED`).
* Propagasi sinyal emergency abort instan via `AbortController`.
* Isolasi pipeline: Menolak penggabungan (*hybrid execution*) aksi browser dengan loop beban volume tinggi demi keamanan resource VPS.

### Out-of-Scope:
* Eksekusi langsung browser Chromium DOM (didelegasikan ke Playwright Worker).
* Pembangkitan traffic HTTP masif (didelegasikan ke HTTP Load Worker).

---

## 3. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-ORCH-01` | Submit E2E Browser Run | Menerima konfigurasi Playwright E2E, membuat `test_run_id`, dan memasukkan job browser ke scheduler. |
| `UC-ORCH-02` | Submit REST API Load Run | Menerima konfigurasi beban/chaining API (VUs, Duration, Profile), membuat `test_run_id`, dan memicu HttpLoadWorker. |
| `UC-ORCH-03` | Monitor Status & Stream Telemetry | Mengumpulkan metrik progres dari worker aktif dan menyiarkan data SSE per-detik ke dashboard. |
| `UC-ORCH-04` | Emergency Abort Run | Menerima sinyal abort dan segera menghentikan antrean task serta proses worker yang sedang berjalan via `AbortController`. |
| `UC-ORCH-05` | Execute E2E Browser Step Pipeline | Mengorkestrasi eksekusi aksi DOM langkah-demi-langkah pada Playwright Worker. |
| `UC-ORCH-06` | Execute REST API Chaining Pipeline | Mengorkestrasi eksekusi request HTTP berantai dengan ekstraksi variabel `{{token}}`. |

---

## 4. Asumsi & Keamanan VPS

| Item | Tipe | Catatan |
|---|---|---|
| Non-Hybrid Rule | Kebijakan Arsitektur | Pengujian browser Playwright dan load testing API dipisahkan total untuk mencegah CPU/RAM exhaustion di VPS. |
| Max Concurrency | Guardrail | Concurrency Playwright dibatasi 2–4 worker; concurrency API load dibatasi 100 Virtual Users. |
