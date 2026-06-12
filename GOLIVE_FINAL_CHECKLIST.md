# 🚀 AL FAKHIR SCHOOL LMS - FINAL GO-LIVE CHECKLIST

**Project Status:** WEEK 4 COMPLETE - PRODUCTION READY  
**Target Launch Date:** [SET YOUR DATE]  
**Deployment Location:** Proxmox (2 locations) + Vercel (frontend)

---

## 📋 PRE-DEPLOYMENT (1 Week Before Launch)

### Infrastructure Setup
```
Proxmox Server 1 (Primary):
☐ Docker installed & updated
☐ Docker Compose installed
☐ PostgreSQL 14 installed (native, for replication)
☐ MinIO directories created (/data/minio)
☐ N8N data directory created (/data/n8n)
☐ Redis directory created (/data/redis)
☐ Nginx directories created (/etc/nginx/*)
☐ SSH keys configured (key-based auth)
☐ Firewall rules set (5432, 9000, 5678, 6379, 80, 443)
☐ Power backup verified
☐ Network bandwidth tested

Proxmox Server 2 (Secondary/Standby):
☐ Docker installed & updated
☐ Docker Compose installed
☐ PostgreSQL 14 installed (native, for replication)
☐ Network connectivity to Server 1 verified (ping test)
☐ SSH access configured
☐ Firewall rules matching Server 1
☐ Same directory structure as Server 1
```

### Database Preparation
```
PostgreSQL Primary (Server 1):
☐ Create database: alfakhir_db
☐ Create replication user: repl (with strong password)
☐ Configure postgresql.conf (wal_level, max_wal_senders)
☐ Configure pg_hba.conf (replication user allowed)
☐ Create base backup for standby
☐ Verify WAL archiving working
☐ Test replication connectivity to Server 2

PostgreSQL Standby (Server 2):
☐ Restore from base backup
☐ Configure recovery.conf (standby_mode, primary_conninfo)
☐ Start PostgreSQL (should connect to primary)
☐ Verify pg_is_in_recovery() returns true
☐ Verify replication lag < 1 second
☐ Test failover procedure (manual promotion)
```

### Credentials & Secrets
```
.env.production file (DO NOT COMMIT):
☐ DATABASE_URL=postgresql://user:pwd@server1:5432/alfakhir_db
☐ DATABASE_REPLICATION_URL=postgresql://repl:pwd@server1:5432/alfakhir_db
☐ JWT_SECRET=[random 64-char string]
☐ JWT_EXPIRE=15m
☐ JWT_REFRESH_EXPIRE=7d
☐ NEXTAUTH_SECRET=[random string]
☐ NEXTAUTH_URL=https://alfakhir.id
☐ NEXT_PUBLIC_API_URL=https://api.alfakhir.id
☐ MINIO_ROOT_USER=admin
☐ MINIO_ROOT_PASSWORD=[strong password]
☐ MINIO_BUCKET=alfakhir-files
☐ REDIS_URL=redis://:password@server1:6379
☐ N8N_ADMIN_EMAIL=admin@alfakhir.id
☐ N8N_ADMIN_PASSWORD=[strong password]
☐ FIREBASE_PROJECT_ID=[from Firebase console]
☐ FIREBASE_PRIVATE_KEY=[service account JSON]
☐ BCA_API_KEY=[from BCA API]
☐ BCA_API_SECRET=[from BCA API]
☐ BCA_CLIENT_ID=[from BCA API]
☐ MANDIRI_CLIENT_ID=[from Mandiri API]
☐ MANDIRI_SECRET_KEY=[from Mandiri API]
☐ SMTP_USER=[Gmail/corporate email]
☐ SMTP_PASS=[App-specific password]
☐ SMTP_HOST=smtp.gmail.com
☐ SMTP_PORT=587
☐ BACKUP_B2_KEY_ID=[Backblaze B2]
☐ BACKUP_B2_APP_KEY=[Backblaze B2]
☐ BACKUP_B2_BUCKET=alfakhir-backup

Verify all credentials working:
☐ Database connection test
☐ MinIO connection test
☐ Firebase test
☐ BCA/Mandiri test (sandbox)
☐ Email test (send to admin)
```

### Domain & SSL
```
Domain:
☐ Domain purchased (alfakhir.id or similar)
☐ Domain registered with Cloudflare
☐ DNS records created:
   ☐ A record: alfakhir.id → Primary server IP
   ☐ CNAME: api.alfakhir.id → Primary server IP
   ☐ CNAME: app.alfakhir.id → Vercel URL
   ☐ MX records for email (if using own email)
☐ DNS propagation verified (dns.google.com check)
☐ Cloudflare SSL/TLS set to "Full (strict)"

SSL Certificates:
☐ Let's Encrypt certificates obtained for:
   ☐ alfakhir.id
   ☐ api.alfakhir.id
   ☐ app.alfakhir.id (if using separate subdomain)
☐ Certificates placed in /etc/letsencrypt/live/
☐ Auto-renewal configured (certbot renewal cron)
☐ Nginx configured to use certificates
☐ SSL test passed (https://www.ssllabs.com/ssltest/)
```

### External Services
```
Firebase Cloud Messaging:
☐ Firebase project linked
☐ FCM enabled
☐ google-services.json downloaded
☐ google-services.json placed in Flutter apps:
   ☐ siswa_app/android/app/google-services.json
   ☐ orang_tua_app/android/app/google-services.json
☐ FCM test message sent successfully

Google Play Store:
☐ Developer account active (payment verified)
☐ Keystore created & backed up:
   ☐ Keystore file: alfakhir.keystore
   ☐ Keystore password: [saved securely]
   ☐ Key alias: alfakhir
   ☐ Key password: [saved securely]
☐ App listings created:
   ☐ Siswa App (com.alfakhir.student)
   ☐ Orang Tua App (com.alfakhir.parent)
☐ Privacy policy URLs provided
☐ Screenshots & descriptions uploaded
☐ Release notes prepared
☐ App icons approved

Backblaze B2:
☐ Account created & payment verified
☐ Bucket created: alfakhir-backup
☐ API key created:
   ☐ Key ID: [saved]
   ☐ App Key: [saved]
☐ Restic repository initialized
☐ Test backup created successfully

Payment Gateways (Sandbox):
☐ BCA API credentials working
☐ Mandiri API credentials working
☐ Test transactions completed
☐ Webhook endpoints verified
☐ Error handling tested
☐ Switchover plan documented (sandbox → production)
```

---

## 🏗️ INFRASTRUCTURE DEPLOYMENT (Launch Day - 1)

### Docker Services
```
On Server 1 (Primary):
☐ Pull latest code from GitHub (main branch)
☐ Copy .env.production to project root
☐ Run: docker-compose -f docker-compose.prod.yml up -d
☐ Verify all containers running:
   ☐ postgresql (healthy)
   ☐ redis (healthy)
   ☐ minio (healthy)
   ☐ n8n (healthy)
   ☐ backend (healthy)
   ☐ nginx (healthy)
☐ Check container logs for errors:
   ☐ docker-compose logs postgresql (no errors)
   ☐ docker-compose logs backend (listening on 3000)
   ☐ docker-compose logs nginx (listening on 80/443)

PostgreSQL Streaming Replication:
☐ Run setup script: scripts/setup-replication.sh
☐ Verify replication status:
   ☐ SELECT * FROM pg_stat_replication; (show standby)
   ☐ Check replication lag (should be < 1s)
   ☐ Test failover:
      ☐ Stop primary container
      ☐ Promote standby manually (on Server 2)
      ☐ Verify standby is now writable
      ☐ Restore primary from backup
      ☐ Resume as new standby
```

### Web Dashboard Deployment
```
Vercel (Guru + Admin Dashboards):
☐ Connect GitHub repository to Vercel
☐ Set environment variables in Vercel:
   ☐ NEXT_PUBLIC_API_URL=https://api.alfakhir.id
   ☐ NEXTAUTH_SECRET=[same as .env.production]
   ☐ NEXTAUTH_URL=https://alfakhir.id
   ☐ Database URL (if needed)
☐ Deploy main branch:
   ☐ Deployment successful (no build errors)
   ☐ Vercel preview URL working
   ☐ Production URL live
☐ Test both dashboards:
   ☐ Guru dashboard accessible at https://alfakhir.id/guru
   ☐ Admin dashboard accessible at https://alfakhir.id/admin
   ☐ Login working
   ☐ API calls successful
   ☐ Logo & branding visible
```

### N8N Workflows
```
N8N Setup:
☐ Access N8N dashboard: http://server1:5678
☐ Import workflows:
   ☐ n8n/payment-creation.json (import & activate)
   ☐ n8n/payment-confirmation.json (import & activate)
   ☐ n8n/overdue-reminder.json (import & activate)
☐ Configure N8N credentials:
   ☐ PostgreSQL connection (to alfakhir_db)
   ☐ Gmail/SMTP (for email notifications)
   ☐ Firebase Cloud Messaging (for FCM)
☐ Test each workflow:
   ☐ Trigger payment-creation manually (check email + FCM)
   ☐ Trigger payment-confirmation manually (check notifications)
   ☐ Verify overdue-reminder cron scheduled (daily 08:00)
```

### Monitoring Setup
```
Monitoring Stack:
☐ Run: docker-compose -f monitoring/docker-compose.monitoring.yml up -d
☐ Verify services:
   ☐ Prometheus accessible at http://server1:9090
   ☐ Grafana accessible at http://server1:3000
   ☐ AlertManager accessible at http://server1:9093
☐ Configure Grafana:
   ☐ Add Prometheus data source
   ☐ Import dashboards (Node Exporter, PostgreSQL, Backend)
   ☐ Configure alert notifications (email)
   ☐ Test alert trigger
☐ Verify alerts:
   ☐ Backend down alert (kill backend container → alert sent)
   ☐ High CPU alert (trigger with stress test)
   ☐ Disk space alert
   ☐ Replication lag alert
```

---

## 📱 MOBILE APP DEPLOYMENT

### Android APK Build & Release
```
Siswa App:
☐ Update version number in pubspec.yaml
☐ Place google-services.json in android/app/
☐ Build APK: flutter build apk --release
   ☐ Build successful, no errors
   ☐ APK size < 150MB
☐ Build AAB: flutter build appbundle --release
   ☐ Build successful
   ☐ AAB size < 100MB
☐ Sign with keystore (scripts/build-apk.sh)
☐ Upload to Google Play Console:
   ☐ Internal testing (give to QA team first)
   ☐ Collect feedback & bugs
   ☐ After 1 day internal testing, release to:
      ☐ Closed alpha (limited testers)
      ☐ Verify FCM notifications working
      ☐ Check performance on different devices
   ☐ After 1 week alpha, release to:
      ☐ Closed beta (wider tester group)
      ☐ Monitor crash reports
      ☐ Collect user feedback
   ☐ After 1 week beta, release to:
      ☐ Production (all users)
      ☐ Monitor reviews & ratings

Orang Tua App:
☐ Same process as Siswa app
☐ Different package name: com.alfakhir.parent
☐ Verify payment status highlighting works
☐ Test child selector (if multiple kids)

Verify:
☐ Both apps installable from Google Play
☐ FCM notifications working
☐ Login working
☐ API calls successful
☐ Offline cache working
☐ No crash reports
```

---

## ✅ LAUNCH DAY (Day 1)

### Pre-Launch (1 Hour Before)
```
Systems Check:
☐ All Docker containers running
☐ PostgreSQL health check passed
☐ Nginx reverse proxy working
☐ API response time < 500ms (test /api/auth/profile)
☐ Dashboards accessible (guru + admin)
☐ Mobile apps tested (sign in + basic features)
☐ FCM notifications tested
☐ Backup system running
☐ Monitoring dashboard showing all green

Database:
☐ Run seed data script: psql -U postgres alfakhir_db < scripts/seed-demo.sql
☐ Verify demo data loaded:
   ☐ 6 demo users created (admin, guru, siswa, ortu, etc)
   ☐ 4 classes created (X IPA 1, X IPA 2, IX A, VIII A)
   ☐ Schedule data loaded
   ☐ Sample nilai & pembayaran created
☐ Database backup taken manually
☐ Backup verified (restore test on separate VM)

Team Readiness:
☐ Admin team trained & online
☐ Teacher training completed (absensi QR + nilai input)
☐ Parent communication sent (download app link + login credentials)
☐ Support team standing by (email, phone, chat)
☐ Incident response plan reviewed

Communications:
☐ Announcement sent to all users (app live, new features)
☐ Support contact information published
☐ FAQ document ready
☐ Video tutorials available (optional)
```

### Launch (Day 1 - Go Live)
```
Morning (8:00 AM):
☐ Send email to all users: System is now LIVE
☐ Monitor all systems:
   ☐ Watch Grafana dashboard for issues
   ☐ Monitor error logs (tail backend logs)
   ☐ Check user login success rate
☐ Have team standing by for first 2 hours

During Day:
☐ Monitor and log:
   ☐ User sign-ups
   ☐ Absensi QR scans (if active)
   ☐ API response times
   ☐ Database performance
   ☐ FCM delivery success rate
☐ Respond to issues within SLA (< 30 min)
☐ Document all issues found
☐ Capture screenshots for later reference

End of Day:
☐ Team sync-up call
☐ Summarize issues found & fixed
☐ Plan for H+1 improvements
☐ Backup database (backup.sh)
☐ Check backup success
```

### H+1 to H+7 (First Week)
```
Daily:
☐ Review monitoring dashboard (9:00 AM)
☐ Check backup logs (all succeeded)
☐ Monitor error rates (< 1% target)
☐ Verify no data loss issues
☐ Test critical paths (login → absensi → nilai → payment)
☐ User support tickets tracked & resolved
☐ Performance metrics collected

H+2 (Second Day):
☐ If no critical issues found, announce stability to users
☐ Start small rollout of real data (optional, if still using demo)

H+3 to H+7:
☐ Database replication testing (manual failover test)
☐ Backup restoration test (restore demo from backup)
☐ Load testing (simulate 1500 concurrent users)
☐ Payment gateway end-to-end test (both BCA & Mandiri)
☐ FCM notification batch test (send 1000 messages)
☐ Mobile app testing on different Android versions

End of Week (H+7):
☐ Stabilization period complete
☐ All critical bugs fixed
☐ System declared production-stable
☐ Handoff to ops team (ongoing maintenance)
☐ Documentation updated with real deployment notes
```

---

## 🔄 ROLLBACK PLAN (If Critical Issues)

### Immediate Actions (< 10 Minutes)
```
If system down:
☐ Enable maintenance mode (Nginx returns 503)
☐ Alert all users
☐ Notify admin + ops team
☐ Start incident investigation
```

### Partial Rollback (15-30 Minutes)
```
If backend issue:
☐ Kill current backend container: docker stop backend
☐ Revert to previous commit: git checkout [previous-tag]
☐ Rebuild & restart: docker build ... && docker-compose up
☐ Verify health: http://server:3000/api/health
☐ If OK → declare fixed
☐ If still broken → continue to full rollback

If database issue:
☐ Switch to PostgreSQL standby:
   ☐ On Server 2: Run promotion script
   ☐ Update primary_conninfo in primary
   ☐ Update Server 1 as new standby
☐ Verify application working
☐ Investigate primary issue
☐ Restore when ready
```

### Full Rollback (30-60 Minutes)
```
If major issue (database corruption, data loss):
☐ Stop all services: docker-compose down
☐ Restore database from last good backup:
   ☐ Get latest backup from B2
   ☐ Restore to separate PostgreSQL instance (test)
☐ Restore MinIO files from backup
☐ Restore application code from git tag
☐ Test on staging first:
   ☐ Restore DB to test server
   ☐ Run smoke tests
   ☐ Verify no data loss
☐ If test passes, restore to production:
☐ Stop production services
☐ Restore from backup
☐ Start services
☐ Verify system working
☐ Document incident & post-mortem
```

---

## 📊 POST-LAUNCH METRICS (First Month)

### Monitor These Metrics
```
Availability:
☐ Target: 99.5% uptime
☐ Measure: Prometheus/Grafana
☐ Alert if: < 99%

Performance:
☐ API response time: < 500ms (p95)
☐ Page load time: < 2s (p95)
☐ Database query time: < 100ms (p95)

User Activity:
☐ Daily active users
☐ Feature usage (absensi %, nilai input %)
☐ Mobile app installs
☐ Login success rate: > 99%

Data Quality:
☐ Absensi matches jurnal guru (reconciliation)
☐ Database integrity checks passed
☐ No missing transactions in logs

Backup Health:
☐ Daily backup completion: 100%
☐ Backup size: within expected range
☐ Restore test: successful (weekly)
```

### Support Metrics
```
First Response Time: < 1 hour
Resolution Time: < 4 hours (critical), < 24 hours (normal)
User Satisfaction: > 4/5 stars
Bug Resolution Rate: 100% (no unresolved bugs in prod)
```

---

## 🎯 SIGN-OFF CHECKLIST

Before declaring go-live complete:

```
Development Team:
☐ Lead Developer: _______________  Date: _______
   (All code reviewed, production-ready)

DevOps/Infrastructure:
☐ DevOps Lead: _______________  Date: _______
   (All systems up & monitored)

QA/Testing:
☐ QA Lead: _______________  Date: _______
   (All critical tests passed)

Project Manager:
☐ PM: _______________  Date: _______
   (Timeline met, deliverables complete)

School Principal/Admin:
☐ Admin: _______________  Date: _______
   (System meets requirements, users trained)

FINAL SIGN-OFF:
☐ All parties agree: System is production-ready
☐ Launch date confirmed: __________________
☐ Go-live approved: ✅
```

---

## 📞 SUPPORT & ESCALATION

### During First 7 Days
```
L1 Support (Issues < 30 min resolution):
- Login problems
- Password reset
- App crashes
- Basic feature issues

L2 Support (Issues < 2 hour resolution):
- Data inconsistency
- Payment not reflecting
- Report generation failure

L3 Support (Incident response):
- Database issues
- Server down
- Data loss
- Security breach

On-Call Contact:
- Primary: [DevOps Lead Phone]
- Secondary: [Backend Lead Phone]
- Email: [Support Email]
```

---

**DEPLOYMENT CHECKLIST COMPLETE**

All items verified → SYSTEM READY FOR PRODUCTION LAUNCH ✅

Next: Execute this checklist and go live! 🚀
