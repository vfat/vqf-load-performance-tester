# Data Dictionary: DD-03-metric-points

## 1. Metadata Table Database

| Field | Value |
|---|---|
| **Table Name** | `metric_points` |
| **Database** | SQLite (`./data/test_history.db`) |
| **Engine** | `better-sqlite3` (WAL mode) |
| **Source of Truth** | [`src/lib/server/storage.ts`](../../src/lib/server/storage.ts) (line 104–114) |
| **Digunakan oleh** | `SqliteHistoryRepository.addMetricPoint()`, `getMetricPoints()` |
| **Deskripsi** | Tabel time-series yang menyimpan snapshot metrik performa per detik selama pengujian beban HTTP (RPS, latency quantiles, error count). Setiap baris merepresentasikan satu "tick" (1 detik) dari sesi load test. |

---

## 2. Struktur Kolom

| Column Name | Type | Nullable | Default | Keterangan |
|---|---|---|---|---|
| `id` | `INTEGER` | ❌ | `AUTOINCREMENT` | **Primary Key.** ID auto-increment unik per titik metrik. |
| `test_run_id` | `TEXT` | ❌ | — | **Foreign Key** ke `test_runs.id`. Menghubungkan titik metrik ini ke sesi test run induknya. |
| `timestamp` | `TEXT` | ❌ | — | Timestamp ISO 8601 saat data titik metrik ini dicatat (`new Date().toISOString()`). |
| `rps` | `REAL` | ✅ | `0` | Request Per Second (throughput) pada detik ini. |
| `p50_ms` | `REAL` | ✅ | `0` | Persentil ke-50 (median) latensi dalam milidetik pada detik ini. |
| `p95_ms` | `REAL` | ✅ | `0` | Persentil ke-95 latensi dalam milidetik. Standar SLA industri. |
| `p99_ms` | `REAL` | ✅ | `0` | Persentil ke-99 latensi (tail latency). Mendeteksi anomali server yang jarang terjadi. |
| `error_count` | `INTEGER` | ✅ | `0` | Jumlah request yang gagal (status 4xx/5xx atau timeout) pada detik ini. |

---

## 3. Indexes

| Tipe Index | Nama Index | Kolom | Keterangan |
|---|---|---|---|
| Primary | *(implicit)* | `id` | Auto-increment unique. |
| Composite Index | `idx_metrics_run` | `test_run_id, timestamp` | Mempercepat query time-series `WHERE test_run_id = ? ORDER BY timestamp` untuk rendering grafik ApexCharts. |

---

## 4. Foreign Keys

| FK Column | References | On Delete | Keterangan |
|---|---|---|---|
| `test_run_id` | `test_runs(id)` | `CASCADE` | Jika sesi test run dihapus, seluruh titik metrik terkait otomatis ikut terhapus. |

---

## 5. Catatan & Asumsi

| Item | Tipe | Catatan |
|---|---|---|
| Granularitas | Keputusan | Satu record per detik (per-tick). Sesi 30 detik menghasilkan ~30 baris; sesi 300 detik ~300 baris. |
| Retensi Data | Asumsi | Belum ada mekanisme TTL atau auto-purge untuk data lama. Baris tetap tersimpan hingga parent `test_runs` dihapus secara manual. |
| Tipe `REAL` | Keputusan | Menggunakan `REAL` (floating point) untuk presisi desimal latensi sub-milidetik. |
