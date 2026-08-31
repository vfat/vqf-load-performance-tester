# Lampiran L-001: Panduan Sinkronisasi Repository ke GitHub

| Metadata | Nilai |
|---|---|
| **ID Lampiran** | `L-001` |
| **Judul** | Panduan Sinkronisasi & Operasional GitHub Repository |
| **Kategori** | Operational / Deployment Guide |
| **Target Repository** | `https://github.com/vfat/vqf-load-performance-tester.git` |
| **Dokumen Terkait** | [project-overview.md](../project-overview.md), [3p.md](../3p.md), [DESIGN.md](../DESIGN.md) |
| **Tanggal Dibuat** | 2026-08-31 |
| **Status** | `ACTIVE / VERIFIED` |

---

## 1. Ringkasan & Tujuan

Dokumen lampiran ini memuat prosedur standar operasional untuk melakukan inisialisasi, komit terstruktur, dan sinkronisasi berkala dari workspace lokal VPS ke remote GitHub repository `vqf-load-performance-tester`.

---

## 2. Struktur Filter Git (`.gitignore`)

Untuk menjaga kebersihan repository dan mencegah kebocoran database lokal atau beban file besar, file [`.gitignore`](../../.gitignore) telah mengonfigurasi pengecualian berikut:

* `node_modules/` — Library runtime & testing.
* `dist/` & `build/` — Hasil kompilasi TypeScript.
* `data/*.db`, `data/*.db-wal`, `data/*.db-shm` — Database runtime SQLite lokal.
* `reports/` — Artifact screenshot uji runtime sementara.
* `.env*` — File konfigurasi kredensial lokal.

---

## 3. Langkah Inisialisasi Pertama (Telah Terverifikasi)

```bash
# 1. Pindah ke direktori project
cd /home/ubuntu/workspace/minilab/pentest

# 2. Inisialisasi Git dan set branch utama
git init
git branch -M main

# 3. Staging dan commit awal
git add .
git commit -m "feat: initial commit - pentest lab load & playwright control deck with live telemetry and custom scenarios design"

# 4. Tambahkan remote origin
git remote add origin https://github.com/vfat/vqf-load-performance-tester.git

# 5. Push branch main ke remote
git push -u origin main
```

---

## 4. Alur Kerja Sinkronisasi Harian (Daily Push Workflow)

Setiap kali menyelesaikan siklus TDD baru atau perubahan konfigurasi, ikuti alur 3 langkah ini:

```bash
# 1. Periksa status file yang berubah
git status

# 2. Tambahkan perubahan dan buat commit dengan pesan semantik
git add .
git commit -m "feat(engine): implement custom scenarios step executor and visual builder"

# 3. Push ke GitHub
git push origin main
```

---

## 5. Hubungan dengan AI Documentor & TDD Workflow

Seluruh riwayat pengembangan di repository ini sinkron dengan artefak di `.ai-doc/`:
1. **`.ai-doc/3p.md`**: Tracking progres `Progress`, `Plan`, `Pending`.
2. **`.ai-doc/tdd-overview.md`**: Bukti kelulusan testing TDD (`RED` ➔ `GREEN` ➔ `REFACTORED`).
3. **`.ai-doc/brainstorming/`**: Notulensi MoM keputusan desain fitur.
4. **`.ai-doc/plan/`**: Spesifikasi desain fitur sebelum implementasi kode.
