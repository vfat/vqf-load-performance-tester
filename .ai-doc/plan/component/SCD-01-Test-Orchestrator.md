# SCD-01-Test-Orchestrator

> **Status:** Active / Enhanced  
> **Target Component:** Test Orchestrator & Execution Engine (`src/lib/server/engine.ts`, `src/lib/server/scheduler.ts`)  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Test Orchestrator adalah komponen sentral (*Control Plane*) yang bertugas menerima perintah pengujian (trigger via Dashboard UI, REST API `/api/runs`, atau CI/CD), memvalidasi konfigurasi pengujian (Single URL Hit, Real HTTP Load Profile, atau Custom Scenario Multi-Step), mengatur antrean eksekusi in-memory dengan concurrency throttle (`TaskScheduler`), dan mengorkestrasi eksekusi worker (Playwright E2E & HTTP Load Worker).

Posisi dalam sistem:
* Menerima request dari aktor luar (QA Engineer, Developer, Dashboard UI, CI/CD Pipeline).
* Mengatur concurrency dan abort signal via in-memory `TaskScheduler`.
* Mengorkestrasi eksekusi Playwright Worker dan HTTP Load Worker.
* Berkoordinasi dengan *SQLite Repository* (`storage.ts`) untuk persistensi dan *Telemetry Streamer* (`streamer.ts`) untuk SSE live streaming.

---

## 2. Scope

### In-Scope:
* Penerimaan dan validasi payload konfigurasi test run (test type: `HYBRID`, `PLAYWRIGHT_ONLY`, `ARTILLERY_ONLY`, target URL, VUs, duration, load profile, custom scenario steps).
* Pembuatan ID unik untuk setiap sesi test run (`test_run_id`).
* Orkestrasi eksekusi skenario tunggal maupun skenario kustom multi-step berurutan (*sequential step pipeline*).
* Pemeliharaan *Shared Execution Context* untuk interpolasi variabel antar-langkah (`{{varName}}`).
* Manajemen status siklus test run (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `ABORTED`).
* Penerimaan sinyal pembatalan darurat (*emergency abort*) dan propagasi `AbortController` ke seluruh worker aktif.

### Out-of-Scope:
* Eksekusi langsung browser Chromium DOM (didelegasikan ke Playwright Worker).
* Pembangkitan traffic HTTP paralel volume tinggi secara langsung (didelegasikan ke HTTP Load Worker).
* Visualisasi grafik frontend (didelegasikan ke Dashboard Web UI).

---

## 3. Prerequisite

* Node.js runtime (v20+) & TypeScript engine.
* Modul in-memory `TaskScheduler` untuk concurrency throttling.
* Koneksi ke SQLite database (`history.db`) untuk pencatatan metadata sesi pengujian.
* Telemetry Streamer (`streamer.ts`) aktif untuk penyiaran event realtime.

---

## 4. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-ORCH-01` | Submit Test Run | Menerima konfigurasi test run, memvalidasi parameter, membuat `test_run_id`, dan memasukkan job ke antrean scheduler. |
| `UC-ORCH-02` | Monitor Run Status & Stream Telemetry | Mengumpulkan metrik progres dari worker pool dan menyiarkan data SSE per-detik ke dashboard. |
| `UC-ORCH-03` | Emergency Abort Run | Menerima sinyal abort dan segera menghentikan antrean task serta proses worker yang sedang berjalan via `AbortController`. |
| `UC-ORCH-04` | Schedule Periodic Run | Memicu test run secara otomatis berdasarkan jadwal cron atau event trigger CI/CD. |
| `UC-ORCH-05` | Execute Custom Multi-Step Scenario | Mengorkestrasi eksekusi rangkaian langkah (*steps pipeline*), melakukan interpolasi variabel context `{{var}}`, dan memvalidasi assertion per-step. |
| `UC-ORCH-06` | Dispatch Real HTTP Load Profile | Mengirimkan parameter Virtual Users (1–100), durasi (5–300s), dan load profile (`fixed`, `ramp-up`, `spike`) ke HTTP Load Worker. |

---

## 5. Catatan Diskusi

* Menggunakan in-memory TaskScheduler berbasis promise queue untuk zero-external container overhead di VPS.
* State interpolasi menggunakan regex safe parser tanpa fungsi `eval()` untuk keamanan eksekusi.

---

## 6. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Concurrency Limit | Asumsi | Batas aman concurrency default adalah 2–4 worker untuk mencegah kehabisan memory di VPS 1GB/2GB. |
| Step Failure Policy | Asumsi | Default perilaku jika salah satu step gagal adalah menghentikan skenario (*fail-fast*) dan mengambil screenshot bukti kegagalan. |
| Maximum Steps | Keputusan | Skenario kustom dibatasi maksimal 20 langkah per run demi stabilitas resource. |
