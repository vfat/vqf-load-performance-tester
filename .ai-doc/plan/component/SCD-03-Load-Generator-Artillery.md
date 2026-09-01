# SCD-03-Load-Generator-Artillery

> **Status:** Active / Enhanced  
> **Target Component:** HTTP Load Generator & Quantiles Engine (`src/lib/server/http-load-worker.ts`, `src/lib/server/artillery-runner.ts`)  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

HTTP Load Generator & Quantiles Engine adalah komponen traffic generator asinkron yang bertugas mengirimkan request HTTP nyata secara paralel dengan jumlah Virtual Users (1–100 VUs), memvariasikan beban sesuai Load Profile (`fixed`, `ramp-up`, `spike`), menghitung statistik persentil latensi secara presisi (p50, p90, p95, p99), serta mengeksekusi request HTTP berantai (*API chaining*) pada skenario kustom.

Posisi dalam sistem:
* Menerima konfigurasi beban dari Test Orchestrator (`engine.ts`).
* Menjalankan loop eksekusi `fetch()` asinkron per detik ke target endpoint.
* Menghitung kuantil latensi menggunakan formula *nearest rank*.
* Menyiarkan metrik per-detik (*ticks*) ke SSE streamer dan menyusun ringkasan akhir (*final summary*).

---

## 2. Scope

### In-Scope:
* Pengiriman request HTTP asinkron nyata dengan dukungan timeout per-koneksi (default 10 detik).
* Pengaturan alokasi Virtual Users (1–100 VUs) dan durasi tes (5–300 detik).
* Implementasi algoritma Load Profile:
  * `fixed`: Beban konstan dari awal hingga akhir.
  * `ramp-up`: Peningkatan VU linier dari 1 ke target VU untuk menemukan batas saturasi server.
  * `spike`: Lonjakan traffic drastis di pertengahan durasi pengujian.
* Perhitungan statistik latensi: `Min`, `Max`, `Avg`, `p50 (Median)`, `p90`, `p95`, `p99`.
* Perhitungan metrik throughput (`RPS`) dan tingkat kegagalan (`Error Rate %`).
* Eksekusi step HTTP berantai dengan ekstraksi variabel JSON (`extractVars`) dan validasi status code (`assertStatus`).
* Responsif terhadap sinyal abort darurat via `AbortSignal`.

### Out-of-Scope:
* Rendering HTML/CSS/DOM atau eksekusi JavaScript client-side (didelegasikan ke Playwright Worker).
* Penyimpanan permanen database (didelegasikan ke SQLite Storage).

---

## 3. Prerequisite

* Node.js runtime (v20+) dengan native `fetch()` dan `AbortController`.
* Konektivitas jaringan ke endpoint target.
* Formula kuantil teruji di `artillery-runner.ts`.

---

## 4. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-ART-01` | Ingest Load Configuration | Memvalidasi konfigurasi beban (target URL, method, VUs, duration, load profile). |
| `UC-ART-02` | Generate Concurrent HTTP Traffic | Mengirimkan `activeVUs` request HTTP secara paralel per detik ke endpoint target. |
| `UC-ART-03` | Scale VUs by Load Profile | Menghitung jumlah VU aktif setiap detik berdasarkan profil `fixed`, `ramp-up`, atau `spike`. |
| `UC-ART-04` | Calculate Precision Quantiles | Menghitung persentil latensi p50, p90, p95, dan p99 menggunakan metode nearest rank. |
| `UC-ART-05` | Emit Realtime Tick Metrics | Menghitung RPS, latensi interval, dan error count per detik untuk disiarkan ke SSE Streamer. |
| `UC-ART-06` | Execute HTTP Step with Variable Extraction | Menembakkan request HTTP pada skenario kustom, mengekstrak nilai JSON ke context, dan memvalidasi HTTP status code. |
| `UC-ART-07` | Emit Final Performance Summary | Mengagregasi seluruh respons dan menyusun laporan ringkasan performa lengkap (12 metrik). |

---

## 5. Catatan Diskusi

* Seluruh body response di-consume secara cepat dan dilepas dari memory untuk menjaga konsumsi RAM tetap di bawah 30MB selama pengetesan ratusan request per detik.
* Latensi dihitung dari awal pengiriman byte pertama hingga response stream selesai diterima.

---

## 6. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Target Rate Limiting | Risiko | Target server mungkin mengembalikan status 429 jika terkena rate limiter; engine mencatatnya sebagai error rate dan tidak menghentikan keseluruhan tes kecuali di-abort. |
| VPS Socket Exhaustion | Mitigasi | Hard limit VUs dibatasi maksimal 100 koneksi konkuren untuk menjaga kestabilan socket TCP di VPS. |
