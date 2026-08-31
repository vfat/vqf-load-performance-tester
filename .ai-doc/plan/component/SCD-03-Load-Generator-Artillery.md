# SCD-03-Load-Generator-Artillery

> **Status:** Draft / Planned  
> **Target Component:** Artillery Load Generator  
> **Workspace:** `.ai-doc/plan/component/`  

---

## 1. Context

Artillery Load Generator adalah komponen worker traffic generator yang bertugas menghasilkan beban HTTP/WebSocket/API volume tinggi (*synthetic high-concurrency traffic*) terhadap target sistem sesuai profil beban yang ditentukan (misal: ramp-up, constant arrival rate, spike test, soak test).

Posisi dalam sistem:
* Mengambil skenario load test dari Redis (`queue:artillery`).
* Menghasilkan jutaan request HTTP/WS dengan concurrency terdistribusi.
* Mengumpulkan metrik latensi (*p50, p90, p95, p99*), RPS (*requests per second*), throughput, dan error code.
* Mengalirkan (*stream*) snapshot metrik ke Prometheus / Metrics Collector.

---

## 2. Scope

### In-Scope:
* Pembacaan skenario konfigurasi beban Artillery (phases, arrival rates, virtual users count, payload CSV/JSON).
* Eksekusi load test engine dengan resource CPU/memory yang efisien.
* Ekspor metrik realtime per-detik / per-fase (latency quantiles, HTTP status codes, socket timeouts).
* Sinyal graceful termination saat durasi selesai atau saat menerima sinyal cancel.

### Out-of-Scope:
* Rendering DOM atau menjalankan JavaScript halaman web (didelegasikan ke Playwright Worker).
* Penjadwalan jangka panjang (dikelola oleh Test Orchestrator).

---

## 3. Prerequisite

* Node.js runtime & Artillery CLI / library engine.
* Akses jaringan dengan bandwidth yang memadai ke target System Under Test.
* Port / endpoint scraping Prometheus untuk metrik exporter.

---

## 4. Daftar Usecase

| Kode Usecase | Nama Usecase | Deskripsi Singkat |
|---|---|---|
| `UC-ART-01` | Ingest Load Profile | Memvalidasi dan memuat file skenario pengujian beban (YAML/JSON). |
| `UC-ART-02` | Generate Concurrent Traffic | Membangkitkan traffic HTTP/WS sesuai phase ramp-up & target RPS. |
| `UC-ART-03` | Collect Real-time Latency | Menghitung statistik latensi (p50, p90, p95, p99) dan mendeteksi request failures. |
| `UC-ART-04` | Export Metrics to Prometheus | Mengekspos metrik ke format Prometheus untuk scraping real-time. |
| `UC-ART-05` | Emit Load Run Summary | Menyusun ringkasan akhir (total requests, success rate, peak RPS) ke Collector. |

---

## 5. Catatan Diskusi

* Artillery menyediakan plugin Prometheus (`artillery-plugin-publish-metrics`) atau custom reporter untuk integrasi mulus dengan dashboard Grafana.
* Untuk load besar, beberapa instance Artillery worker dapat dijalankan paralel dengan konfigurasi pembagian virtual users merata.

---

## 6. Asumsi, Risiko, dan Hal yang Perlu Dikonfirmasi

| Item | Tipe | Catatan |
|---|---|---|
| Network Saturation | Risiko | Generator traffic yang terlalu agresif pada interface jaringan yang sama dapat mendistorsi hasil pengukuran latensi. |
| Target Authorization | Asumsi | Skenario pengujian menyertakan token/kredensial autentikasi yang valid untuk target API. |
| Custom Payload Data | Perlu Dikonfirmasi | Apakah load test membutuhkan injeksi data dynamic dari CSV/Faker generator? |
