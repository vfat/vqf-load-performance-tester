# SCD-02-Playwright-Worker-Pool

> **Status:** Active / Enhanced  
> **Target Component:** Playwright Worker Runner (`src/lib/server/playwright-runner.ts`)  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Playwright Worker Runner bertugas mengeksekusi pengujian browser E2E headless Chromium secara terisolasi (`BrowserContext`), menangani penantian hidrasi DOM (`networkidle` + buffer rendering), menangkap bukti screenshot otomatis, dan mengeksekusi aksi interaksi granular (Click, Fill, Wait, Assert) pada skenario kustom.

Posisi dalam sistem:
* Menerima instruksi eksekusi skenario browser dari Test Orchestrator (`engine.ts`).
* Melakukan navigasi dan interaksi DOM nyata terhadap System Under Test (SUT).
* Mengambil tangkapan layar bukti eksekusi ke `./reports/screenshots/`.
* Mengembalikan hasil terstruktur (`status`, `durationMs`, `screenshotPath`, `errorMessage`) ke Orchestrator & SQLite Storage.

---

## 2. Scope

### In-Scope:
* Pengelolaan siklus hidup context browser Playwright Chromium headless secara terisolasi (zero cross-contamination).
* Navigasi URL target dengan strategi `networkidle` (fallback ke window `load` + 800ms hydration delay).
* Penanganan pengujian *flaky* dengan mekanisme retry terkonfigurasi.
* Eksekusi aksi interaktif spesifik per-langkah:
  * `GOTO`: Navigasi URL.
  * `CLICK`: Klik elemen DOM via CSS/XPath selector.
  * `FILL`: Pengisian input field form / textarea.
  * `WAIT_SELECTOR`: Menunggu elemen muncul di DOM.
  * `ASSERT_TEXT`: Memvalidasi kecocokan teks pada elemen target.
  * `SCREENSHOT`: Pengambilan tangkapan layar spesifik per-step.
* Pelaporan kegagalan terperinci beserta screenshot bukti error.

### Out-of-Scope:
* Pembangkitan traffic HTTP murni volume tinggi tanpa browser (didelegasikan ke HTTP Load Worker).
* Penyimpanan rekaman video berukuran besar (hanya menyimpan gambar format PNG terkompresi).

---

## 3. Prerequisite

* Chromium headless browser binaries terpasang via `playwright install chromium`.
* Direktori artifact `./reports/screenshots/` tersedia untuk penyimpanan tangkapan layar.
* Resource memori teralokasi aman (Chromium headless dioptimalkan dengan argumen `--no-sandbox`, `--disable-dev-shm-usage`).

---

## 4. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-PW-01` | Launch Isolated Browser Context | Menyiapkan context Chromium baru dengan viewport 1280x800 untuk setiap sesi pengetesan. |
| `UC-PW-02` | Execute Target URL Verification | Membuka URL target, menunggu hidrasi networkidle penuh, dan mengambil tangkapan layar. |
| `UC-PW-03` | Handle Flaky & Retry | Mendeteksi kegagalan sementara dan melakukan retry otomatis sesuai konfigurasi `maxRetries`. |
| `UC-PW-04` | Capture Artifact on Failure | Mengambil screenshot dan mencatat pesan error saat terjadi kegagalan navigasi atau assertion. |
| `UC-PW-05` | Emit Execution Result | Mengirimkan laporan durasi, assertion status (`PASSED`/`FAILED`), dan path screenshot ke Orchestrator. |
| `UC-PW-06` | Execute Browser Action Steps | Mengeksekusi rangkaian langkah DOM interaktif kustom (`CLICK`, `FILL`, `WAIT_SELECTOR`, `ASSERT_TEXT`) secara berurutan. |

---

## 5. Catatan Diskusi

* Menggunakan `networkidle` dengan timeout guard 15 detik untuk memastikan Single Page Application (SPA / React / Vue / Svelte) selesai melakukan client-side fetch data sebelum screenshot diambil.
* Setiap session context langsung ditutup (`context.close()` & `browser.close()`) untuk mencegah kebocoran memori di VPS.

---

## 6. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Memory Guard | Risiko | Headless browser memakan ~100MB–150MB per instance; concurrency Playwright dibatasi 2–4 worker di level TaskScheduler. |
| Storage Lokasi | Keputusan | Screenshot disimpan di `./reports/screenshots/` terpisah dari direktori dokumentasi `.ai-doc/`. |
