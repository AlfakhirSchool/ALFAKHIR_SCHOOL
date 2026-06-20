import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ActivityLog } from '../models';

// Map URL path → (action label, table name)
function resolveAction(method: string, path: string): { action: string; table: string | null } {
  const p = path.replace(/\/[a-f0-9-]{36}/gi, '/:id').replace(/\/\d+/g, '/:id');

  const map: Array<[string, RegExp, string, string | null]> = [
    // Auth
    ['POST',   /\/auth\/login/,                   'Login',                          null],
    ['POST',   /\/auth\/logout/,                  'Logout',                         null],
    ['PUT',    /\/auth\/change-password/,          'Ganti Password',                 'users'],
    ['POST',   /\/auth\/upload-photo/,             'Upload Foto Profil',             'users'],
    // Siswa
    ['GET',    /\/siswa\/:id$/,                    'Lihat Detail Siswa',             'siswa'],
    ['POST',   /\/siswa$/,                         'Tambah Siswa',                   'siswa'],
    ['PUT',    /\/siswa\/:id$/,                    'Edit Data Siswa',                'siswa'],
    ['DELETE', /\/siswa\/:id$/,                    'Hapus Siswa',                    'siswa'],
    // Guru
    ['POST',   /\/guru$/,                          'Tambah Guru',                    'guru'],
    ['PUT',    /\/guru\/:id$/,                     'Edit Data Guru',                 'guru'],
    ['DELETE', /\/guru\/:id$/,                     'Hapus Guru',                     'guru'],
    // Kelas
    ['POST',   /\/kelas$/,                         'Tambah Kelas',                   'kelas'],
    ['PUT',    /\/kelas\/:id$/,                    'Edit Kelas',                     'kelas'],
    ['DELETE', /\/kelas\/:id$/,                    'Hapus Kelas',                    'kelas'],
    // Mata Pelajaran
    ['POST',   /\/mata-pelajaran$/,                'Tambah Mata Pelajaran',          'mata_pelajaran'],
    ['PUT',    /\/mata-pelajaran\/:id$/,           'Edit Mata Pelajaran',            'mata_pelajaran'],
    ['DELETE', /\/mata-pelajaran\/:id$/,           'Hapus Mata Pelajaran',           'mata_pelajaran'],
    // Absensi
    ['POST',   /\/absensi\/scan-qr/,               'Scan QR Absensi',                'absensi'],
    ['POST',   /\/absensi\/input-code/,            'Input Kode Absensi',             'absensi'],
    ['POST',   /\/absensi\/generate-qr/,           'Buat QR Absensi',                'absensi'],
    ['POST',   /\/absensi$/,                       'Input Absensi',                  'absensi'],
    ['PUT',    /\/absensi\/:id$/,                  'Edit Absensi',                   'absensi'],
    ['DELETE', /\/absensi\/:id$/,                  'Hapus Absensi',                  'absensi'],
    // Nilai
    ['POST',   /\/nilai$/,                         'Input Nilai',                    'nilai'],
    ['PUT',    /\/nilai\/:id$/,                    'Edit Nilai',                     'nilai'],
    ['DELETE', /\/nilai\/:id$/,                    'Hapus Nilai',                    'nilai'],
    // Pembayaran
    ['POST',   /\/pembayaran$/,                    'Buat Pembayaran',                'pembayaran'],
    ['PUT',    /\/pembayaran\/:id$/,               'Edit Pembayaran',                'pembayaran'],
    ['DELETE', /\/pembayaran\/:id$/,               'Hapus Pembayaran',               'pembayaran'],
    // Jurnal Guru
    ['POST',   /\/jurnal-guru$/,                   'Tambah Jurnal Guru',             'jurnal_guru'],
    ['PUT',    /\/jurnal-guru\/:id$/,              'Edit Jurnal Guru',               'jurnal_guru'],
    ['DELETE', /\/jurnal-guru\/:id$/,              'Hapus Jurnal Guru',              'jurnal_guru'],
    ['PUT',    /\/jurnal-guru\/:id\/review/,       'Review Jurnal Guru',             'jurnal_guru'],
    // Jadwal
    ['POST',   /\/jadwal-pelajaran$/,              'Tambah Jadwal',                  'jadwal_pelajaran'],
    ['PUT',    /\/jadwal-pelajaran\/:id$/,         'Edit Jadwal',                    'jadwal_pelajaran'],
    ['DELETE', /\/jadwal-pelajaran\/:id$/,         'Hapus Jadwal',                   'jadwal_pelajaran'],
    // Rapor
    ['POST',   /\/rapor/,                          'Proses Rapor',                   'rapor'],
  ];

  for (const [m, re, label, table] of map) {
    if (m === method && re.test(p)) return { action: label, table };
  }

  // Fallback generic label
  const verb = method === 'POST' ? 'Tambah' : method === 'PUT' || method === 'PATCH' ? 'Edit' : 'Hapus';
  const resource = path.split('/').filter(Boolean)[1] || 'data';
  return { action: `${verb} ${resource}`, table: resource };
}

function detectAppSource(req: AuthRequest): string {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const header = req.headers['x-app-source'] as string;
  if (header) return header;
  if (ua.includes('dart') || ua.includes('flutter')) {
    const role = req.user?.role;
    if (role === 'siswa') return 'Siswa App';
    if (role === 'ortu') return 'Orang Tua App';
    if (role === 'guru') return 'Guru App';
    return 'Mobile App';
  }
  if (ua.includes('mozilla') || ua.includes('chrome') || ua.includes('safari')) return 'Web';
  return 'API';
}

// Global auto-logger — mount BEFORE routes in app.ts
export const globalAuditLogger = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const shouldLog = (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ||
    (req.method === 'POST' && req.path.includes('/auth/login'))
  );

  if (shouldLog) {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only log on success (2xx)
      if (res.statusCode < 400) {
        const { action, table } = resolveAction(req.method, req.path);
        const recordId = req.params?.id || body?.data?.id || null;
        const safeBody = { ...req.body };
        delete safeBody.password; delete safeBody.password_hash;
        delete safeBody.old_password; delete safeBody.new_password;

        ActivityLog.create({
          user_id: req.user?.id || null,
          nama: req.user?.nama || null,
          role: req.user?.role || null,
          school_level: req.user?.school_level || null,
          app_source: detectAppSource(req),
          action,
          table_name: table,
          record_id: recordId,
          new_value: Object.keys(safeBody).length ? safeBody : null,
          ip_address: req.ip || null,
          user_agent: req.headers['user-agent'] || null,
        }).catch(() => {});
      }
      return originalJson(body);
    };
  }

  next();
};

// Manual log helper for specific use cases (e.g., login before user is in req.user)
export const logAction = async (opts: {
  user_id?: string; nama?: string; role?: string; school_level?: string | null;
  app_source?: string; action: string; table?: string; record_id?: string;
  new_value?: object; ip?: string; user_agent?: string;
}): Promise<void> => {
  await ActivityLog.create({
    user_id: opts.user_id || null,
    nama: opts.nama || null,
    role: opts.role || null,
    school_level: opts.school_level || null,
    app_source: opts.app_source || 'Web',
    action: opts.action,
    table_name: opts.table || null,
    record_id: opts.record_id || null,
    new_value: opts.new_value || null,
    ip_address: opts.ip || null,
    user_agent: opts.user_agent || null,
  }).catch(() => {});
};
