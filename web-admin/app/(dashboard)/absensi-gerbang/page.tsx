'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const fmt = (ts: string | null) =>
  ts ? new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-';

export default function AbsensiGerbangPage() {
  const [search, setSearch] = useState('');
  const [dropdown, setDropdown] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [qrMode, setQrMode] = useState<'masuk' | 'pulang'>('masuk');
  const [showQrPanel, setShowQrPanel] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: hariIni = [], refetch } = useQuery({
    queryKey: ['absensi-gerbang-hari-ini'],
    queryFn: () => api.get('/absensi-gerbang/hari-ini').then(r => r.data.data || []),
    refetchInterval: 30000,
  });

  const { data: dailyToken, refetch: refetchToken } = useQuery({
    queryKey: ['absensi-gerbang-daily-token'],
    queryFn: () => api.get('/absensi-gerbang/daily-token').then(r => r.data.data),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.length < 2) { setDropdown([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.get('/absensi-gerbang/cari-siswa', { params: { q: search } });
        setDropdown(r.data.data || []);
      } catch {}
    }, 300);
  }, [search]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const masukMut = useMutation({
    mutationFn: (siswa_id: string) => api.post('/absensi-gerbang/masuk', { siswa_id }),
    onSuccess: (res) => { showToast(res.data.message); setSearch(''); setDropdown([]); refetch(); },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal mencatat masuk', 'error'),
  });

  const pulangMut = useMutation({
    mutationFn: (siswa_id: string) => api.post('/absensi-gerbang/pulang', { siswa_id }),
    onSuccess: (res) => { showToast(res.data.message); setSearch(''); setDropdown([]); refetch(); },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal mencatat pulang', 'error'),
  });

  const stats = {
    masuk: (hariIni as any[]).filter((r: any) => r.waktu_masuk).length,
    pulang: (hariIni as any[]).filter((r: any) => r.waktu_pulang).length,
  };

  const currentToken = dailyToken?.[qrMode];
  const qrImageUrl = currentToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(currentToken.qr_data)}`
    : null;

  return (
    <div>
      <Header title="Absensi Gerbang Sekolah" />
      <div className="p-6 space-y-6">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? '✅ ' : '❌ '}{toast.msg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sudah Masuk Hari Ini</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats.masuk}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-blue-500">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Sudah Pulang</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.pulang}</p>
          </div>
        </div>

        {/* ===== QR Panel untuk Siswa ===== */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setShowQrPanel(!showQrPanel)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-teal-500 to-teal-600 text-white"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div className="text-left">
                <p className="font-bold text-base">QR Code Absensi Gerbang</p>
                <p className="text-xs opacity-80">Tampilkan ke siswa untuk di-scan via App Siswa</p>
              </div>
            </div>
            <span className="text-xl">{showQrPanel ? '▲' : '▼'}</span>
          </button>

          {showQrPanel && (
            <div className="p-6">
              {/* Toggle Masuk/Pulang */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => setQrMode('masuk')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-colors ${
                    qrMode === 'masuk' ? 'bg-green-500 text-white border-green-500 shadow' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                  }`}
                >
                  ▶ QR Masuk Sekolah
                </button>
                <button
                  onClick={() => setQrMode('pulang')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-colors ${
                    qrMode === 'pulang' ? 'bg-blue-500 text-white border-blue-500 shadow' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  ◀ QR Pulang Sekolah
                </button>
              </div>

              {/* QR Display */}
              <div className={`rounded-2xl p-6 text-center ${qrMode === 'masuk' ? 'bg-green-50 border-2 border-green-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
                <p className={`font-bold text-lg mb-1 ${qrMode === 'masuk' ? 'text-green-700' : 'text-blue-700'}`}>
                  {qrMode === 'masuk' ? '▶ ABSENSI MASUK SEKOLAH' : '◀ ABSENSI PULANG SEKOLAH'}
                </p>
                <p className="text-xs text-gray-500 mb-5">
                  {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>

                {/* QR Image */}
                <div className="flex justify-center mb-5">
                  {qrImageUrl ? (
                    <div className="bg-white p-3 rounded-2xl shadow-md inline-block">
                      <img
                        src={qrImageUrl}
                        alt="QR Code Absensi Gerbang"
                        width={240}
                        height={240}
                        className="rounded-xl"
                      />
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-2xl shadow-md w-[256px] h-[256px] flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <p className="text-4xl mb-2">⏳</p>
                        <p className="text-sm">Memuat QR...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kode Manual */}
                {currentToken && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">atau gunakan kode manual</p>
                    <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-3xl font-bold tracking-[0.3em] ${
                      qrMode === 'masuk' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {currentToken.code}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Kode berlaku untuk hari ini saja · otomatis ganti besok</p>
                  </div>
                )}

                <button
                  onClick={() => refetchToken()}
                  className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Muat ulang QR
                </button>
              </div>

              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">📲 Cara pakai:</p>
                <p>Siswa buka App Siswa → menu Absensi → pilih "Absensi Gerbang" → scan QR di atas atau masukkan kode 6 digit</p>
              </div>
            </div>
          )}
        </div>

        {/* ===== Input Manual oleh Admin (cari nama siswa) ===== */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-[#1A2332] mb-4">Catat Manual oleh Admin</h3>
          <p className="text-sm text-gray-500 mb-4">Jika siswa tidak bisa scan QR, admin bisa mencatat langsung di sini.</p>

          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama siswa..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
            />
            {dropdown.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 z-20 mt-1 max-h-72 overflow-y-auto">
                {dropdown.map((s: any) => {
                  const rec = (hariIni as any[]).find((r: any) => r.siswa_id === s.id);
                  return (
                    <div key={s.id} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#1A2332] text-sm">{s.nama}</p>
                          <p className="text-xs text-gray-400">{s.nama_kelas} · {s.nama_sekolah} · NIS: {s.nis}</p>
                          {rec && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {rec.waktu_masuk && <span className="text-green-600">▶ Masuk {fmt(rec.waktu_masuk)}</span>}
                              {rec.waktu_pulang && <span className="text-blue-600 ml-2">◀ Pulang {fmt(rec.waktu_pulang)}</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => { setSearch(''); setDropdown([]); masukMut.mutate(s.id); }}
                            disabled={masukMut.isPending || pulangMut.isPending}
                            className="px-3 py-2 bg-green-500 text-white text-xs rounded-lg font-bold hover:bg-green-600 disabled:opacity-50"
                          >
                            ▶ Masuk
                          </button>
                          <button
                            onClick={() => { setSearch(''); setDropdown([]); pulangMut.mutate(s.id); }}
                            disabled={masukMut.isPending || pulangMut.isPending}
                            className="px-3 py-2 bg-blue-500 text-white text-xs rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50"
                          >
                            ◀ Pulang
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Ketik minimal 2 huruf untuk mencari nama siswa</p>
        </div>

        {/* Daftar hari ini */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#1A2332]">Kehadiran Hari Ini</h3>
            <span className="text-xs text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
          {(hariIni as any[]).length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🏫</p>
              <p className="text-sm">Belum ada siswa yang dicatat hari ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Nama Siswa</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Kelas</th>
                    <th className="text-left px-6 py-3 font-semibold text-gray-600">Sekolah</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Masuk</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Pulang</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Notif WA</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(hariIni as any[]).map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 font-medium text-[#1A2332]">{r.nama_siswa}</td>
                      <td className="px-6 py-3 text-gray-500">{r.nama_kelas}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs px-2 py-0.5 rounded font-medium bg-teal-50 text-teal-700">{r.jenjang}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.waktu_masuk ? <span className="text-green-600 font-bold">{fmt(r.waktu_masuk)}</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.waktu_pulang ? <span className="text-blue-600 font-bold">{fmt(r.waktu_pulang)}</span> : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs">
                        {r.notif_masuk_sent && <span className="text-green-500">📱✓</span>}
                        {r.notif_pulang_sent && <span className="text-blue-500 ml-1">📱✓</span>}
                        {!r.notif_masuk_sent && !r.notif_pulang_sent && <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => masukMut.mutate(r.siswa_id)} disabled={masukMut.isPending}
                            className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded hover:bg-green-100 font-medium">▶</button>
                          <button onClick={() => pulangMut.mutate(r.siswa_id)} disabled={pulangMut.isPending}
                            className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded hover:bg-blue-100 font-medium">◀</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
