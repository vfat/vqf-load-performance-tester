# SCD-04-Result-Metrics-Collector

> **Status:** Draft / Planned  
> **Target Component:** Result & Metrics Collector  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Result & Metrics Collector adalah komponen backend data aggregator yang bertugas menerima laporan eksekusi dari Playwright Worker Pool dan Artillery Generator, menyimpan riwayat run dan detail assertion ke PostgreSQL, serta mengekspos metrik sistem/testing ke Prometheus untuk divisualisasikan pada Grafana.

Posisi dalam sistem:
* Mengonsumsi event dan result summary dari Worker Pool via REST / Redis Stream.
* Melakukan batch insert dan relasional query pada PostgreSQL.
* Menyediakan endpoint metrik untuk Prometheus scraper.
* Menyediakan REST API query untuk Orchestrator / Dashboard guna melihat riwayat test run.

---

## 2. Scope

### In-Scope:
* Penerimaan payload status eksekusi (test case pass/fail, error stack trace, duration, latency percentiles).
* Persistensi data relasional: `test_suites`, `test_runs`, `test_executions`, `metric_snapshots`.
* Penyusunan laporan agregat per-run (total test cases, failure rate, SLA compliance check).
* Menyediakan metrics endpoint (`/metrics`) berstandar Prometheus.
* API query untuk riwayat pengujian dan perbandingan performa (*trend analysis*).

### Out-of-Scope:
* Penyimpanan file binary besar seperti video recording (hanya menyimpan path/URL referensi).
* Pembuatan visual UI chart khusus (memanfaatkan Grafana standard dashboard).

---

## 3. Prerequisite

* Database PostgreSQL / TimescaleDB terhubung dengan skema tabel yang siap.
* Prometheus server terkonfigurasi untuk scrape endpoint collector.
* Kontrak schema DTO untuk payload event eksekusi.

---

## 4. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-COL-01` | Ingest Execution Event | Menerima laporan event test pass/fail secara streaming atau batch dari worker. |
| `UC-COL-02` | Persist Test Run Summary | Menyimpan ringkasan akhir test run (waktu mulai, selesai, total passed, failed, duration) ke PostgreSQL. |
| `UC-COL-03` | Record Latency Metrics | Menyimpan snapshot data latensi (p50, p90, p99, throughput, error rate) ke database / time-series. |
| `UC-COL-04` | Expose Prometheus Metrics | Mengekspos counter, gauge, dan histogram metrik untuk Prometheus scraping. |
| `UC-COL-05` | Query Run History & SLA | Menyediakan API untuk membaca riwayat run, detail error, dan validasi ambang batas SLA/SLO. |

---

## 5. Catatan Diskusi

* Menggunakan batch insert dengan buffer interval (misal setiap 500ms atau 100 events) untuk mencegah database bottleneck saat load testing tinggi.
* Indeks PostgreSQL difokuskan pada `test_run_id`, `status`, dan `created_at` untuk mempercepat query reporting.

---

## 6. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Database Write Lock | Risiko | Ribuan write per detik saat high load test dapat membebani database; mitigasi dengan in-memory buffering & batch insert. |
| Time-series vs Relasional | Asumsi | PostgreSQL standar cukup untuk MVP; TimescaleDB extension dapat diaktifkan jika volume time-series membesar. |
| Retention Policy | Perlu Dikonfirmasi | Berapa lama data riwayat log dan metrik pengujian disimpan (misal 30 hari)? |
