# Data Dictionary: DD-01-test-runs

## 1. Metadata Table Database

| Field | Value |
|---|---|
| **Table Name** | `test_runs` |
| **Database** | SQLite (`./data/test_history.db`) |
| **Engine** | `better-sqlite3` (WAL mode) |
| **Source of Truth** | [`src/lib/server/storage.ts`](../../src/lib/server/storage.ts) (line 69–90) |
| **Digunakan oleh** | `SqliteHistoryRepository.createRun()`, `updateRun()`, `getRun()`, `listRuns()` |
| **Deskripsi** | Tabel utama yang menyimpan metadata sesi pengujian: identitas run, konfigurasi beban, status lifecycle, dan ringkasan metrik performa akhir. |

---

## 2. Struktur Kolom

| Column Name | Type | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `TEXT` | ❌ | — | **Primary Key.** UUID unik per sesi test run. Dibuat oleh caller (`crypto.randomUUID()`). |
| `suite_name` | `TEXT` | ❌ | — | Nama deskriptif sesi pengujian yang diisi pengguna (e.g. "Login Flow Load Test"). |
| `test_type` | `TEXT` | ❌ | — | Mode eksekusi: `HYBRID`, `PLAYWRIGHT_ONLY`, atau `ARTILLERY_ONLY`. |
| `status` | `TEXT` | ❌ | — | Status lifecycle sesi: `QUEUED` → `RUNNING` → `COMPLETED` / `FAILED` / `ABORTED`. |
| `target_url` | `TEXT` | ✅ | `NULL` | URL endpoint target yang diuji (e.g. `https://api.example.com/health`). |
| `started_at` | `TEXT` | ❌ | — | Timestamp ISO 8601 saat sesi dimulai (`new Date().toISOString()`). |
| `completed_at` | `TEXT` | ✅ | `NULL` | Timestamp ISO 8601 saat sesi selesai. `NULL` jika belum selesai. |
| `total_scenarios` | `INTEGER` | ✅ | `0` | Jumlah total skenario Playwright yang dijadwalkan. |
| `passed_scenarios` | `INTEGER` | ✅ | `0` | Jumlah skenario yang lulus (`PASSED`). |
| `failed_scenarios` | `INTEGER` | ✅ | `0` | Jumlah skenario yang gagal (`FAILED`). |
| `duration_ms` | `INTEGER` | ✅ | `0` | Durasi total sesi pengujian dalam milidetik. |
| `summary_json_path` | `TEXT` | ✅ | `NULL` | Path file laporan ringkasan JSON statis (reserved, belum diimplementasi). |
| `report_html_path` | `TEXT` | ✅ | `NULL` | Path file laporan HTML interaktif statis (reserved, belum diimplementasi). |
| `virtual_users` | `INTEGER` | ✅ | `1` | Jumlah Virtual Users yang dikonfigurasi (range: 1–100). |
| `duration_seconds` | `INTEGER` | ✅ | `30` | Durasi pengujian beban dalam detik (range: 5–300). |
| `load_profile` | `TEXT` | ✅ | `'fixed'` | Profil beban yang digunakan: `fixed`, `ramp-up`, atau `spike`. |
| `http_method` | `TEXT` | ✅ | `'GET'` | HTTP method yang digunakan untuk load test: `GET`, `POST`, `PUT`, `DELETE`. |
| `avg_latency_ms` | `REAL` | ✅ | `0` | Rata-rata latensi seluruh request HTTP setelah tes selesai (milidetik). |
| `total_requests` | `INTEGER` | ✅ | `0` | Jumlah total request HTTP yang terkirim selama sesi load test. |
| `error_rate_percent` | `REAL` | ✅ | `0` | Persentase request yang gagal (status 4xx/5xx atau timeout). |

---

## 3. Indexes

| Tipe Index | Nama Index | Kolom | Keterangan |
|---|---|---|---|
| Primary | *(implicit)* | `id` | Unique identifier per sesi run. |
| Index | `idx_runs_date` | `started_at DESC` | Mempercepat query `ORDER BY started_at DESC` untuk paginasi riwayat di dashboard. |

---

## 4. Foreign Keys

Tabel ini **tidak memiliki foreign key ke tabel lain** (parent table).

Tabel ini **direferensikan oleh:**
- `test_executions.test_run_id` → `test_runs.id` (`ON DELETE CASCADE`)
- `metric_points.test_run_id` → `test_runs.id` (`ON DELETE CASCADE`)

---

## 5. Catatan & Asumsi

| Item | Tipe | Catatan |
|---|---|---|
| `summary_json_path`, `report_html_path` | Reserved | Kolom untuk fitur Static Report Export (Step 3 di Plan). Saat ini nilainya selalu `NULL`. |
| `virtual_users` max 100 | Keputusan | Hard limit 100 VU konkuren untuk menjaga kestabilan socket TCP di VPS. |
| Tipe `TEXT` untuk timestamps | Keputusan | SQLite tidak memiliki tipe `DATETIME` native; menggunakan `TEXT` dengan format ISO 8601 standar. |
