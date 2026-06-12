# Al Fakhir School LMS — Monitoring Guide

**Version:** 1.0  
**Last Updated:** 2026-06-13

---

## Arsitektur Monitoring

```
┌─────────────┐     scrape     ┌────────────┐     alert     ┌──────────────┐
│  Node       │ ─────────────→ │            │ ────────────→ │ AlertManager │
│  Exporter   │                │ Prometheus │               │              │
│  Postgres   │ ─────────────→ │            │               └──────────────┘
│  Exporter   │                └────────────┘                      │
│  Backend    │                      │                             │ notify
│  /metrics   │                      │ datasource             Telegram/Email
└─────────────┘                      ↓
                               ┌────────────┐
                               │  Grafana   │  ← dashboards
                               └────────────┘
```

**Stack:** Prometheus 2.x + Grafana 10.x + AlertManager + Node Exporter + Postgres Exporter

---

## 1. Setup Monitoring Stack

### Start monitoring services

```bash
cd ~/alfakhir
docker compose -f monitoring/docker-compose.monitoring.yml up -d
```

### Verifikasi

```bash
docker ps | grep -E "prometheus|grafana|alertmanager"

# Test Prometheus
curl -s http://localhost:9090/-/healthy  # → Prometheus is Healthy.

# Test Grafana
curl -s http://localhost:3000/api/health | jq .  # → {"commit":"...","database":"ok"}
```

---

## 2. Akses Dashboards

| Service | URL | Default Login |
|---------|-----|---------------|
| Grafana | `http://[SERVER_IP]:3000` | admin / admin |
| Prometheus | `http://[SERVER_IP]:9090` | — (no auth) |
| AlertManager | `http://[SERVER_IP]:9093` | — (no auth) |

> **Security:** Batasi akses Grafana/Prometheus ke IP internal saja via UFW:
> ```bash
> ufw allow from 10.10.10.0/24 to any port 3000
> ufw allow from 10.10.10.0/24 to any port 9090
> ```

---

## 3. Import Grafana Dashboard

1. Login ke Grafana (`admin/admin`, ganti password saat pertama login)
2. **Configuration → Data Sources → Add data source**
   - Type: `Prometheus`
   - URL: `http://prometheus:9090`
   - Name: `Prometheus`
   - Klik **Save & Test** → "Data source is working"

3. **Dashboards → Import**
   - Upload file: `monitoring/grafana-dashboard.json`
   - Select datasource: `Prometheus`
   - Klik **Import**

### Dashboard Panels

| Panel | Metric | Alert Threshold |
|-------|--------|----------------|
| API Requests/min | `rate(http_requests_total[1m])` | — |
| API Error Rate % | `rate(http_errors_total[5m])` | > 5% |
| P95 API Latency | `histogram_quantile(0.95, ...)` | > 1000ms |
| Active DB Connections | `pg_stat_activity_count` | > 80 |
| CPU Usage % | `node_cpu_seconds_total` | > 85% |
| Memory Usage % | `node_memory_MemAvailable_bytes` | > 90% |
| Disk Usage % | `node_filesystem_avail_bytes` | > 80% |
| Backend Status | probe_success | = 0 (down) |
| Redis Memory | `redis_memory_used_bytes` | > 400MB |
| Error Logs | Loki query | — |

---

## 4. Alert Rules

File: `monitoring/alert.rules.yml`

### Alert yang sudah dikonfigurasi

```yaml
# Backend down > 1 menit
- alert: BackendDown
  expr: up{job="backend"} == 0
  for: 1m
  severity: critical

# PostgreSQL down > 1 menit
- alert: PostgresDown
  expr: up{job="postgres"} == 0
  for: 1m
  severity: critical

# Error rate > 5% selama 5 menit
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
  for: 5m
  severity: warning

# CPU > 85% selama 5 menit
- alert: HighCpuUsage
  expr: 100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
  for: 5m
  severity: warning

# Memory > 90% selama 5 menit
- alert: HighMemoryUsage
  expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
  for: 5m
  severity: critical

# Disk > 80%
- alert: DiskSpaceLow
  expr: (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 80
  for: 1m
  severity: warning

# PostgreSQL connections > 80
- alert: PostgresConnectionsHigh
  expr: pg_stat_activity_count > 80
  for: 5m
  severity: warning
```

---

## 5. Setup Alert Notifications

### Option A: Telegram (Recommended)

1. Buat Telegram Bot:
   - Chat dengan `@BotFather` di Telegram
   - Kirim `/newbot` → ikuti instruksi
   - Catat **Bot Token**: `7123456789:AAFxxx...`

2. Dapatkan Chat ID:
   - Tambahkan bot ke grup/channel monitoring
   - Buka: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Cari `"chat":{"id":...}` — catat Chat ID

3. Edit `monitoring/alertmanager.yml`:

```yaml
route:
  receiver: 'telegram'

receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: '7123456789:AAFxxx...'
        chat_id: -1001234567890
        message: |
          🚨 *{{ .GroupLabels.alertname }}*
          Status: {{ .Status | toUpper }}
          {{ range .Alerts }}
          • {{ .Annotations.description }}
          {{ end }}
```

4. Restart AlertManager:
```bash
docker restart alfakhir_alertmanager
```

### Option B: Email (SMTP)

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@alfakhirschool.id'
        from: 'monitoring@alfakhirschool.id'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'your-gmail@gmail.com'
        auth_password: 'your-app-password'   # Google App Password
        require_tls: true
```

### Option C: Slack

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/T.../B.../xxx'
        channel: '#monitoring-alfakhir'
        text: '{{ .CommonAnnotations.description }}'
```

---

## 6. Prometheus Queries Berguna

```promql
# API request rate (per minute)
rate(http_requests_total[1m]) * 60

# Error rate percentage
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# P95 response latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage %
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# Disk usage %
(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100

# PostgreSQL active connections
pg_stat_activity_count{datname="alfakhir_school"}

# Redis memory (MB)
redis_memory_used_bytes / 1024 / 1024

# Container CPU %
rate(container_cpu_usage_seconds_total{name="alfakhir_backend"}[1m]) * 100
```

---

## 7. Key Metrics & Baselines

Nilai baseline untuk sistem sehat:

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| API Response P95 | < 200ms | 200-500ms | > 500ms |
| Error Rate | < 0.1% | 0.1-5% | > 5% |
| CPU Usage | < 60% | 60-85% | > 85% |
| Memory Usage | < 70% | 70-90% | > 90% |
| Disk Usage | < 60% | 60-80% | > 80% |
| DB Connections | < 20 | 20-80 | > 80 |
| Redis Memory | < 200MB | 200-400MB | > 400MB |

---

## 8. Log Monitoring

### Akses logs

```bash
# Backend logs (real-time)
docker logs alfakhir_backend -f --tail 100

# Filter errors only
docker logs alfakhir_backend 2>&1 | grep -E "ERROR|WARN" | tail -50

# PostgreSQL logs
docker logs alfakhir_postgres -f --tail 50

# Nginx access logs
docker exec alfakhir_nginx tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec alfakhir_nginx tail -f /var/log/nginx/error.log
```

### Log rotation

Log dirotasi otomatis via Docker logging driver di `docker-compose.prod.yml`:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"
    max-file: "5"
```

File log tersimpan di: `/var/lib/docker/containers/[CONTAINER_ID]/`

### Pola log yang perlu diperhatikan

```bash
# High error rate
docker logs alfakhir_backend 2>&1 | grep -c "ERROR"

# Slow queries (> 1s)
docker logs alfakhir_postgres 2>&1 | grep "duration:" | awk '$NF > 1000'

# Failed login attempts
docker logs alfakhir_backend 2>&1 | grep "Login gagal"

# Out of memory
docker logs alfakhir_backend 2>&1 | grep -E "OOM|heap|memory"
```

---

## 9. Health Check Script

```bash
# Jalankan monitoring snapshot
bash scripts/monitor.sh once

# Monitoring real-time (refresh tiap 10s)
bash scripts/monitor.sh watch

# Generate HTML report
bash scripts/monitor.sh report
# → /tmp/alfakhir-monitor-YYYYMMDD_HHMMSS.html
```

---

## 10. Uptime Monitoring (External)

Gunakan layanan gratis untuk monitoring dari luar:

### UptimeRobot (Gratis)
1. Daftar di [uptimerobot.com](https://uptimerobot.com)
2. Add Monitor → HTTP(s)
3. URL: `https://api.alfakhirschool.id/api/health`
4. Interval: 5 menit
5. Alert: Email + Telegram

### Better Stack (Gratis tier)
1. Daftar di [betterstack.com](https://betterstack.com)
2. Create Monitor → URL monitoring
3. Set alert escalation rules

---

## 11. Performance Monitoring

### Load test

```bash
# Light test (10 concurrent, 100 requests)
bash scripts/load-test.sh light http://localhost:3001/api

# Heavy test (50 concurrent, 1000 requests)
bash scripts/load-test.sh heavy http://localhost:3001/api
```

### Database slow query log

```bash
# Enable slow query logging (> 500ms)
docker exec alfakhir_postgres psql -U alfakhir -c \
  "ALTER SYSTEM SET log_min_duration_statement = 500;"
docker exec alfakhir_postgres psql -U alfakhir -c \
  "SELECT pg_reload_conf();"

# Lihat slow queries
docker exec alfakhir_postgres psql -U alfakhir -d alfakhir_school -c \
  "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

---

## Troubleshooting Monitoring

| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| Grafana blank dashboard | Prometheus datasource disconnected | Re-add datasource, check `prometheus:9090` reachable |
| No metrics from backend | `/metrics` endpoint not exposed | Check backend has prometheus middleware |
| Alert not sending | AlertManager config error | `docker logs alertmanager` → check config syntax |
| Prometheus targets DOWN | Exporter container not running | `docker ps` → start missing exporter |
| High disk from logs | Docker log files too large | `docker system prune` + adjust max-size |

---

*Support: smpislamalfakhir@gmail.com*
