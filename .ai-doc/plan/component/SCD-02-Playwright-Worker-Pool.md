# SCD-02-Playwright-Worker-Pool

> **Status:** Draft / Planned  
> **Target Component:** Playwright Worker Pool  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Playwright Worker Pool adalah kumpulan container/proses worker yang bertugas mengambil job pengujian browser E2E dari antrean Redis (`queue:playwright`), menjalankan skenario browser interaktif secara headless, mengumpulkan trace/screenshot saat terjadi kegagalan, dan mengirimkan hasil eksekusi ke *Result & Metrics Collector*.

Posisi dalam sistem:
* Mengambil (*consume*) job dari antrean Redis.
* Melakukan interaksi browser terhadap System Under Test (SUT).
* Mengirimkan status eksekusi, log, artefak (screenshot/video/traces), dan metrik ke Collector.

---

## 2. Scope

### In-Scope:
* Pengelolaan siklus hidup browser context (Chromium/Firefox/WebKit) secara efisien dan terisolasi.
* Eksekusi skenario Playwright test dengan parameter dinamis (base URL, viewport, credentials, timeouts).
* Penanganan pengujian *flaky* dengan mekanisme retry terkonfigurasi.
* Pengambilan artefak failure (screenshot, DOM snapshot, error traces).
* Pelaporan hasil run per-test case (status, duration, failure reason).
* Heartbeat pelaporan kesehatan worker ke Redis/Orchestrator.

### Out-of-Scope:
* Load generation murni volume tinggi (RPS jutaan) tanpa browser (didelegasikan ke Artillery).
* Penyimpanan permanen jangka panjang untuk artefak blob besar (disimpan ke object storage atau mounted volume).

---

## 3. Prerequisite

* Container environment dengan dependencies browser Playwright (Chromium/Firefox/WebKit).
* Akses jaringan ke Redis dan target System Under Test (SUT).
* Resource CPU dan Memory yang teralokasi dengan batasan terdefinisi (misal: 1 CPU & 1GB RAM per worker process).

---

## 4. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-PW-01` | Fetch & Claim Job | Mengambil task E2E dari Redis queue dan menandai status worker menjadi busy. |
| `UC-PW-02` | Execute E2E Scenario | Menjalankan skrip interaksi browser Playwright pada target URL. |
| `UC-PW-03` | Handle Flaky & Retry | Mendeteksi kegagalan sementara dan melakukan retry sesuai threshold yang diizinkan. |
| `UC-PW-04` | Capture Artifacts on Failure | Mengambil screenshot, trace file, dan log konsol saat assertion gagal. |
| `UC-PW-05` | Emit Execution Result | Mengirimkan laporan durasi, assertion result, dan status (`PASSED`/`FAILED`) ke Collector. |

---

## 5. Catatan Diskusi

* Setiap worker mengisolasi `BrowserContext` untuk setiap test case agar state/cookies tidak saling mengotori (*zero cross-contamination*).
* Worker dapat dijalankan sebagai Kubernetes Job pod (scale-to-zero) atau Docker worker container pool yang dinamis.

---

## 6. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Memory Leak | Risiko | Browser headless dapat menyisakan memory leak jika satu process instance hidup terlalu lama; worker harus me-recycle browser process secara berkala. |
| Headless vs Heave | Asumsi | Default browser dijalankan dalam mode headless Chromium untuk efisiensi resource maksimum. |
| Storage Artefak | Perlu Dikonfirmasi | Di mana screenshot & video trace disimpan (Local volume / MinIO / S3)? |
