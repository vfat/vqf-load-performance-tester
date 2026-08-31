# Lampiran L-002: Panduan Menjalankan dan Mengelola Server Aplikasi

| Metadata | Nilai |
|---|---|
| **ID Lampiran** | `L-002` |
| **Judul** | Panduan Menjalankan dan Mengelola Server Dashboard & Engine |
| **Kategori** | Operational / Deployment Guide |
| **Target Port** | `2087` (Default) / Configurable via `PORT` env |
| **Dokumen Terkait** | [project-overview.md](../project-overview.md), [3p.md](../3p.md), [L-001-Panduan-GitHub-Sync.md](./L-001-Panduan-GitHub-Sync.md) |
| **Tanggal Dibuat** | 2026-08-31 |
| **Status** | `ACTIVE / VERIFIED` |

---

## 1. Ringkasan & Tujuan

Dokumen lampiran ini memuat panduan operasional langkah demi langkah untuk menyalakan kembali (*startup*), mengonfigurasi port, menjalankan proses di latar belakang (*background daemon*), memverifikasi koneksi, serta mematikan server aplikasi pentest lab.

---

## 2. Prasyarat Lingkungan (Prerequisites)

Sebelum menyalakan server, pastikan dependensi telah terpasang:

```bash
# Masuk ke direktori kerja
cd /home/ubuntu/workspace/minilab/pentest

# Pastikan node_modules dan browser Chromium Playwright terpasang
npm install
npx playwright install chromium
```

---

## 3. Cara Menjalankan Aplikasi

### Opsi A: Mode Standar (Foreground di Port 2087)
Gunakan opsi ini saat ingin melihat log server secara langsung di terminal:

```bash
# 1. Build TypeScript (jika ada perubahan kode baru)
npm run build

# 2. Jalankan server dashboard
npm start
```
*Server akan aktif di: `http://localhost:2087`*

---

### Opsi B: Mode Custom Port
Jika port `2087` sedang digunakan oleh aplikasi lain di VPS, Anda bisa menentukan port lain secara dinamis:

```bash
# Menjalankan di port 3000 (contoh)
PORT=3000 node dist/src/server.js

# Atau di port 8080
PORT=8080 npm start
```

---

### Opsi C: Mode Background Daemon (Tetap Berjalan Setelah Terminal Ditutup)

Untuk menjalankan server secara persisten di background VPS:

```bash
# Menggunakan nohup
PORT=2087 nohup node dist/src/server.js > server.log 2>&1 &

# Atau menggunakan PM2 (jika terinstall di VPS)
pm2 start dist/src/server.js --name "pentest-deck" --env PORT=2087
```

---

## 4. Cara Memverifikasi Server Aktif

Jalankan perintah berikut untuk mengecek status kesehatan server:

```bash
# 1. Cek status port aktif
lsof -i :2087

# 2. Query endpoint status via curl
curl -s http://localhost:2087/api/status
```
*Response JSON yang diharapkan:*
```json
{"state":"IDLE","currentRunId":null,"activeWorkers":0,"totalTasks":0,"completedTasks":0,"currentRps":0,"p95LatencyMs":0}
```

---

## 5. Cara Mematikan Server & Menutup Port

Jika ingin mematikan server dan menutup port `2087`:

```bash
# Cara 1: Matikan proses berdasarkan nomor port
fuser -k 2087/tcp

# Cara 2: Cari PID lalu matikan
PID=$(lsof -t -i:2087)
if [ -n "$PID" ]; then
  kill -9 $PID
  echo "Server pada PID $PID berhasil dimatikan. Port 2087 tertutup."
fi

# Menggunakan PM2 (jika dijalankan via PM2)
pm2 stop pentest-deck
```

---

## 6. Menjalankan Suite Pengujian Otomatis (Testing)

Untuk memastikan seluruh 35+ skenario pengujian unit & integrasi lulus sebelum menyalakan server:

```bash
npm test
```
