# SCD-01-Test-Orchestrator

> **Status:** Draft / Planned  
> **Target Component:** Test Orchestrator Service  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Test Orchestrator adalah komponen sentral (Control Plane) yang bertugas menerima perintah pengujian (trigger via CLI, API, atau CI/CD), memvalidasi konfigurasi pengujian (skenario Playwright atau profil load Artillery), membagi beban pengujian menjadi job-job kecil, dan mendistribusikannya ke queue buffer (Redis) untuk dikonsumsi oleh Worker Pool.

Posisi dalam sistem:
* Menerima request dari aktor luar (QA Engineer, Developer, CI/CD Pipeline).
* Menulis task/job ke Redis Queue.
* Berkoordinasi dengan *Result & Metrics Collector* untuk tracking siklus hidup eksekusi test run.

---

## 2. Scope

### In-Scope:
* Penerimaan dan validasi payload konfigurasi test run (test type, concurrency, target URL, scenario list, duration).
* Pembuatan ID unik untuk setiap sesi test run (`test_run_id`).
* Enqueue job ke antrean Redis sesuai kategori (`queue:playwright`, `queue:artillery`).
* Manajemen status siklus test run (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`).
* Penerimaan sinyal pembatalan (*abort/cancel*) dan broadcast sinyal terminate ke worker pool.

### Out-of-Scope:
* Eksekusi langsung browser Playwright (didelegasikan ke Playwright Worker Pool).
* Pembangkitan traffic HTTP secara langsung (didelegasikan ke Artillery Generator).
* Agregasi analitik jangka panjang (didelegasikan ke Result Store / PostgreSQL).

---

## 3. Prerequisite

* Redis server yang dapat diakses sebagai queue broker.
* Definisi kontrak konfigurasi skenario uji (JSON/YAML schema).
* Koneksi ke PostgreSQL untuk pencatatan metadata sesi pengujian.

---

## 4. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-ORCH-01` | Submit Test Run | Menerima konfigurasi test run, memvalidasi schema, membuat `test_run_id`, dan memasukkan job ke antrean Redis. |
| `UC-ORCH-02` | Monitor Run Status | Memantau progres penyelesaian job dari worker pool dan mengupdate status run di database. |
| `UC-ORCH-03` | Cancel Test Run | Mengirim sinyal cancel/abort ke seluruh worker yang sedang mengeksekusi job terkait `test_run_id`. |
| `UC-ORCH-04` | Schedule Periodic Run | Memicu test run secara otomatis berdasarkan jadwal cron atau event trigger. |

---

## 5. Catatan Diskusi

* Menggunakan Redis Streams / Redis Lists (`BLPOP`/`RPUSH` atau `BullMQ`) untuk memastikan pengiriman task terjamin (*guaranteed delivery*) dan minim overhead.
* Orchestrator didesain stateless agar dapat di-replicate jika diperlukan (mengandalkan Redis untuk koordinasi).

---

## 6. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Engine Queue | Asumsi | Redis dipilih sebagai message/task buffer utama karena latensi sangat rendah dan ringan. |
| Worker Failure Handling | Risiko | Jika worker mati saat memproses job, orchestrator membutuhkan mekanisme heartbeats / visibility timeout agar task dapat di-requeue. |
| Skenario Distribusi | Perlu Dikonfirmasi | Apakah skenario Playwright dibagi per file test atau per individual test case? |
