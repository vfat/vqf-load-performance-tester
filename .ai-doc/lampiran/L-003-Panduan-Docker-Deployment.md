# Lampiran L-003: Panduan Docker Deployment & Registri Docker Hub

> **Last Updated:** 2026-09-03  
> **Image Registry:** `docker.io/vickyfatrian/vqf-load-tester:latest`  
> **Port Default:** `2087`  
> **Volume Persistence:** `/app/data` (SQLite DB) dan `/app/reports` (Screenshots)

---

## 1. Ikhtisar Image

Image Docker `vickyfatrian/vqf-load-tester:latest` dibangun menggunakan **Multi-Stage Build**:
- **Builder Stage (`node:22-bookworm`):** Meng-compile TypeScript dan modul native C++ (`better-sqlite3`).
- **Runner Stage (`node:22-bookworm-slim`):** Menggunakan runtime minimal yang telah diisi Chromium binary Playwright dan seluruh library OS yang dibutuhkan untuk headless browser.

---

## 2. Cara Menjalankan Image

### Opsi A: Menggunakan Docker CLI Langsung

```bash
docker run -d \
  --name vqf-load-tester \
  --restart unless-stopped \
  -p 2087:2087 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/reports:/app/reports \
  vickyfatrian/vqf-load-tester:latest
```

### Opsi B: Menggunakan Docker Compose (Direkomendasikan)

Gunakan file [docker-compose.yml](file:///home/ubuntu/workspace/minilab/pentest/docker-compose.yml):

```yaml
services:
  pentest-platform:
    image: vickyfatrian/vqf-load-tester:latest
    container_name: vqf-load-tester
    restart: unless-stopped
    ports:
      - "2087:2087"
    environment:
      - PORT=2087
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./reports:/app/reports
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:2087/api/status"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

Jalankan dengan perintah:
```bash
docker compose up -d
```

Akses dashboard di: **`http://localhost:2087`**

---

## 3. Perintah Operasional Docker

| Aksi | Perintah |
|---|---|
| Cek status container | `docker ps -f name=vqf-load-tester` |
| Pantau realtime logs | `docker logs -f vqf-load-tester` |
| Cek health status | `curl -s http://localhost:2087/api/status` |
| Stop container | `docker compose down` atau `docker stop vqf-load-tester` |
| Update ke image terbaru | `docker compose pull && docker compose up -d` |

---

## 4. Prosedur Build Ulang & Push ke Docker Hub

Jika terdapat perubahan source code baru di masa mendatang:

```bash
# 1. Login Docker Hub (jika sesi expired)
docker login -u vickyfatrian

# 2. Build image
docker build -t vickyfatrian/vqf-load-tester:latest .

# 3. Push ke Docker Hub
docker push vickyfatrian/vqf-load-tester:latest
```
