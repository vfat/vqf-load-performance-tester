# SCD-03-Load-Generator-Artillery

> **Status:** Active / Enhanced (Deck 2 Dedicated Worker)  
> **Target Component:** HTTP Load Generator & Quantiles Engine (`src/lib/server/http-load-worker.ts`, `src/lib/server/artillery-runner.ts`)  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

HTTP Load Generator & Quantiles Engine bertugas secara khusus untuk **Deck 2: REST API Load Deck**. Menjalankan pengujian beban volume tinggi asinkron dengan Virtual Users (1–1.000 VUs), profil beban (`fixed`, `ramp-up`, `spike`), kalkulasi kuantil latensi (p50..p99), serta eksekusi request REST API berantai (*Multi-Endpoint Chaining* mirip Postman dengan setup per-request: method, headers, payload, dan ekstraksi token/variabel `{{var}}`).

Posisi dalam sistem:
* Menerima konfigurasi beban dan API Chaining dari Test Orchestrator (`engine.ts`).
* Menjalankan eksekusi berantai multi-endpoint secara paralel untuk setiap virtual user (hingga 1.000 VUs) dengan HTTP Connection Pooling & Keep-Alive.
* Menghitung metrik kuantil latensi (nearest rank), RPS, dan error rate per detik (*ticks*).
* Menyusun ringkasan akhir (*final summary*) 12 metrik performa.

---

## 2. Scope

### In-Scope:
* Pengiriman request HTTP asinkron nyata dengan timeout guard dan HTTP Agent Keep-Alive (mendukung hingga 1.000 concurrent sockets).
* Skalabilitas Virtual Users (1–1.000 VUs) dan durasi (5–300 detik).
* Algoritma profil beban: `fixed` (konstan), `ramp-up` (linier naik), `spike` (lonjakan traffic).
* Perhitungan statistik latensi: `Min`, `Max`, `Avg`, `p50 (Median)`, `p90`, `p95`, `p99`.
* Alur Visual Postman-like REST API Chaining:
  * Setup mandiri per-step: Method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`), URL, Headers, Body JSON.
  * Ekstraksi variabel respons dinamis (misal: `extractVars: { "authToken": "data.token" }` atau `userId: "data.user.id"`).
  * Substitusi variabel `{{authToken}}` pada URL, header, dan payload langkah berikutnya secara independen per-VU.
  * Asersi HTTP Status Code & JSON response path.
* Responsif terhadap sinyal abort darurat via `AbortSignal`.

### Out-of-Scope:
* Rendering HTML/CSS/DOM atau eksekusi JavaScript browser (sepenuhnya ditangani di Deck 1 oleh Playwright Worker).

---

## 3. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-ART-01` | Ingest Load Configuration | Memvalidasi konfigurasi beban (target URL, method, VUs, duration, load profile). |
| `UC-ART-02` | Generate Concurrent HTTP Traffic | Mengirimkan `activeVUs` request HTTP secara paralel per detik ke endpoint target. |
| `UC-ART-03` | Scale VUs by Load Profile | Menghitung jumlah VU aktif setiap detik berdasarkan profil `fixed`, `ramp-up`, atau `spike`. |
| `UC-ART-04` | Calculate Precision Quantiles | Menghitung persentil latensi p50, p90, p95, dan p99 menggunakan metode nearest rank. |
| `UC-ART-05` | Emit Realtime Tick Metrics | Menghitung RPS, latensi interval, dan error count per detik untuk disiarkan ke SSE Streamer. |
| `UC-ART-06` | Execute REST API Chaining Step | Menembakkan request HTTP berantai, mengekstrak variabel token ke context, dan memvalidasi HTTP status code. |
| `UC-ART-07` | Emit Final Performance Summary | Mengagregasi seluruh respons dan menyusun laporan ringkasan performa 12 metrik. |
