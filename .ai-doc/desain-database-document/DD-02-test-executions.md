# Data Dictionary: DD-02-test-executions

## 1. Metadata Table Database

| Field | Value |
|---|---|
| **Table Name** | `test_executions` |
| **Database** | SQLite (`./data/test_history.db`) |
| **Engine** | `better-sqlite3` (WAL mode) |
| **Source of Truth** | [`src/lib/server/storage.ts`](../../src/lib/server/storage.ts) (line 92–102) |
| **Digunakan oleh** | `SqliteHistoryRepository.addExecution()`, `getExecutions()` |
| **Deskripsi** | Tabel detail yang mencatat hasil eksekusi setiap sub-skenario (Playwright E2E scenario, browser action step, atau HTTP chaining step) dalam satu sesi test run. |

---

## 2. Struktur Kolom

| Column Name | Type | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `INTEGER` | ❌ | `AUTOINCREMENT` | **Primary Key.** ID auto-increment unik per record eksekusi. |
| `test_run_id` | `TEXT` | ❌ | — | **Foreign Key** ke `test_runs.id`. Menghubungkan eksekusi ini ke sesi test run induknya. |
| `scenario_name` | `TEXT` | ❌ | — | Nama skenario/step yang dieksekusi (e.g. "Navigate to Login Page", "POST /auth/login"). |
| `status` | `TEXT` | ❌ | — | Status hasil eksekusi: `PASSED` atau `FAILED`. |
| `duration_ms` | `INTEGER` | ✅ | `0` | Durasi eksekusi skenario ini dalam milidetik. |
| `retry_count` | `INTEGER` | ✅ | `0` | Jumlah retry yang dilakukan sebelum mencapai status final (untuk flaky test handling). |
| `error_message` | `TEXT` | ✅ | `NULL` | Pesan error detail jika status `FAILED`. `NULL` jika skenario berhasil. |
| `screenshot_path` | `TEXT` | ✅ | `NULL` | Path relatif ke file screenshot bukti (e.g. `reports/screenshots/target-abc-xyz.png`). |

---

## 3. Indexes

| Tipe Index | Nama Index | Kolom | Keterangan |
|---|---|---|---|
| Primary | *(implicit)* | `id` | Auto-increment unique. |
| Index | `idx_exec_run` | `test_run_id` | Mempercepat query `WHERE test_run_id = ?` untuk inspeksi detail run. |

---

## 4. Foreign Keys

| FK Column | References | On Delete | Keterangan |
|---|---|---|---|
| `test_run_id` | `test_runs(id)` | `CASCADE` | Jika sesi test run dihapus, seluruh record eksekusi terkait otomatis ikut terhapus. |

---

## 5. Catatan & Asumsi

| Item | Tipe | Catatan |
|---|---|---|
| Sort Order | Keputusan | Record diurutkan `ORDER BY id ASC` untuk memastikan urutan kronologis eksekusi step. |
| Screenshot Path | Konvensi | Path disimpan relatif dari root project (e.g. `reports/screenshots/...`), bukan path absolut. |
