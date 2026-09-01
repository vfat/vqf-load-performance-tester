# SCD-02-Playwright-Worker-Pool

> **Status:** Active / Enhanced (Deck 1 Dedicated Worker)  
> **Target Component:** Playwright Worker Runner (`src/lib/server/playwright-runner.ts`)  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Playwright Worker Runner bertugas secara khusus mengeksekusi pengujian browser E2E headless Chromium untuk **Deck 1: Playwright E2E Studio**. Menangani penantian hidrasi DOM (`networkidle` + buffer rendering), menangkap bukti screenshot otomatis, dan mengeksekusi aksi interaksi langkah-demi-langkah (GOTO, CLICK, FILL, WAIT, ASSERT_TEXT, SCREENSHOT).

Posisi dalam sistem:
* Menerima instruksi eksekusi skenario browser dari Test Orchestrator (`engine.ts`).
* Melakukan navigasi dan interaksi DOM nyata terhadap System Under Test (SUT).
* Mengambil tangkapan layar bukti eksekusi ke `./reports/screenshots/` dan mengalirkan status step ke dashboard web.

---

## 2. Scope

### In-Scope:
* Pengelolaan context browser Playwright Chromium headless secara terisolasi (viewport 1280x800).
* Navigasi URL target dengan strategi `networkidle` (fallback ke window `load` + 800ms hydration delay).
* Eksekusi aksi interaktif spesifik per-langkah (Step Actions):
  * `GOTO`: Navigasi URL.
  * `CLICK`: Klik elemen DOM via CSS/XPath selector.
  * `FILL`: Pengisian input form / textarea.
  * `WAIT`: Menunggu timeout durasi atau kemunculan elemen.
  * `ASSERT_TEXT`: Memvalidasi kecocokan teks pada elemen target.
  * `SCREENSHOT`: Pengambilan tangkapan layar pada tahapan tertentu.
* Pengambilan screenshot otomatis saat terjadi kegagalan (*on-failure screenshot*).

### Out-of-Scope:
* Penembakan traffic beban HTTP volume tinggi (sepenuhnya ditangani di Deck 2 oleh HTTP Load Worker).

---

## 3. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-PW-01` | Launch Isolated Browser Context | Menyiapkan context Chromium baru dengan viewport 1280x800 untuk setiap sesi pengetesan. |
| `UC-PW-02` | Execute Target URL Verification | Membuka URL target, menunggu hidrasi networkidle penuh, dan mengambil tangkapan layar. |
| `UC-PW-03` | Handle Flaky & Retry | Mendeteksi kegagalan sementara dan melakukan retry otomatis sesuai konfigurasi `maxRetries`. |
| `UC-PW-04` | Capture Artifact on Failure | Mengambil screenshot dan mencatat pesan error saat terjadi kegagalan navigasi atau assertion. |
| `UC-PW-05` | Emit Step Execution Event | Mengirimkan laporan durasi per-step dan path screenshot ke Orchestrator dan SSE Streamer. |
| `UC-PW-06` | Execute Browser Action Steps | Mengeksekusi rangkaian langkah DOM interaktif kustom (`GOTO`, `CLICK`, `FILL`, `WAIT`, `ASSERT_TEXT`) secara berurutan. |
