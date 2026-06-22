'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const fmt = (ts: string | null) =>
  ts ? new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-';

export default function AbsensiGerbangPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dropdown, setDropdown] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [mode, setMode] = useState<'masuk' | 'pulang'>('masuk');

  // QR modal state
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrResult, setQrResult] = useState<any>(null);
  const [qrError, setQrError] = useState<string>('');
  const [kodeInput, setKodeInput] = useState('');
  const [inputMode, setInputMode] = useState<'camera' | 'kode'>('camera');

  const searchRef = useRef<HTMLInputElement>(null);
  const kodeRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: hariIni = [], refetch } = useQuery({
    queryKey: ['absensi-gerbang-hari-ini'],
    queryFn: () => api.get('/absensi-gerbang/hari-ini').then(r => r.data.data || []),
    refetchInterval: 30000,
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
    onSuccess: (res) => {
      showToast(res.data.message);
      setSearch(''); setDropdown([]);
      setQrResult(null); setShowQrModal(false);
      refetch();
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal mencatat masuk', 'error'),
  });

  const pulangMut = useMutation({
    mutationFn: (siswa_id: string) => api.post('/absensi-gerbang/pulang', { siswa_id }),
    onSuccess: (res) => {
      showToast(res.data.message);
      setSearch(''); setDropdown([]);
      setQrResult(null); setShowQrModal(false);
      refetch();
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal mencatat pulang', 'error'),
  });

  const handleRecord = (siswa_id: string) => {
    if (mode === 'masuk') masukMut.mutate(siswa_id);
    else pulangMut.mutate(siswa_id);
  };

  const todayRecord = (siswa_id: string) => (hariIni as any[]).find((r: any) => r.siswa_id === siswa_id);

  const stats = {
    masuk: (hariIni as any[]).filter((r: any) => r.waktu_masuk).length,
    pulang: (hariIni as any[]).filter((r: any) => r.waktu_pulang).length,
  };

  // ─── QR Camera ───────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const lookupByCode = async (code: string) => {
    try {
      const r = await api.get('/absensi-gerbang/siswa-by-code', { params: { code } });
      setQrResult(r.data.data);
      setQrError('');
    } catch (e: any) {
      setQrError(e.response?.data?.message || 'Siswa tidak ditemukan dengan kode ini');
      setQrResult(null);
    }
  };

  const startCamera = useCallback(async () => {
    setQrError('');
    setQrResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const BD = (window as any).BarcodeDetector;
      if (BD) {
        const detector = new BD({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              const code = codes[0].rawValue;
              clearInterval(scanIntervalRef.current!);
              stopCamera();
              lookupByCode(code);
            }
          } catch {}
        }, 500);
      } else {
        setQrError('Browser ini tidak mendukung scan QR otomatis. Gunakan tab "Input Kode".');
      }
    } catch (e: any) {
      setQrError('Tidak bisa akses kamera: ' + (e.message || 'izin ditolak'));
    }
  }, [stopCamera]);

  const handleKodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kodeInput.trim()) lookupByCode(kodeInput.trim());
  };

  const openQrModal = () => {
    setShowQrModal(true);
    setQrResult(null);
    setQrError('');
    setKodeInput('');
    setInputMode('camera');
  };

  const closeQrModal = () => {
    stopCamera();
    setShowQrModal(false);
    setQrResult(null);
    setQrError('');
    setKodeInput('');
  };

  useEffect(() => {
    if (showQrModal && inputMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
      if (showQrModal && inputMode === 'kode') {
        setTimeout(() => kodeRef.current?.focus(), 100);
      }
    }
  }, [showQrModal, inputMode, startCamera, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

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

        {/* Info banner */}
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
          <p className="font-semibold mb-1">📱 Notifikasi WhatsApp Otomatis</p>
          <p>Setiap kali siswa dicatat <strong>Masuk</strong> atau <strong>Pulang</strong>, orang tua akan langsung menerima pesan WA.</p>
        </div>

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

        {/* Catat Kehadiran */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-[#1A2332] mb-4">Catat Kehadiran Siswa</h3>

          {/* Toggle Masuk/Pulang */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setMode('masuk')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border-2 ${
                mode === 'masuk' ? 'bg-green-500 text-white border-green-500 shadow-md' : 'bg-white text-green-600 border-green-200 hover:bg-green-50'
              }`}
            >
              <span className="text-lg">▶</span> Scan Masuk Sekolah
            </button>
            <button
              onClick={() => setMode('pulang')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border-2 ${
                mode === 'pulang' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
              }`}
            >
              <span className="text-lg">◀</span> Scan Pulang Sekolah
            </button>
          </div>

          <div className={`text-center text-xs font-semibold py-1.5 rounded-lg mb-4 ${
            mode === 'masuk' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
          }`}>
            Mode aktif: {mode === 'masuk' ? '▶ CATAT MASUK' : '◀ CATAT PULANG'}
          </div>

          {/* Tombol QR Scan */}
          <button
            onClick={openQrModal}
            className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 mb-4 transition-colors ${
              mode === 'masuk' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <span className="text-2xl">📷</span>
            <div className="text-left">
              <p>Scan QR / Input Kode Siswa</p>
              <p className="text-xs opacity-80 font-normal">Scan QR card siswa atau input NIS/NISN manual</p>
            </div>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <p className="text-xs text-gray-400 font-medium">atau cari nama siswa</p>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Pencarian nama */}
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
                  const rec = todayRecord(s.id);
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
                        <button
                          onClick={() => { setSearch(''); setDropdown([]); handleRecord(s.id); }}
                          disabled={masukMut.isPending || pulangMut.isPending}
                          className={`px-4 py-2 text-white text-xs rounded-lg font-bold flex-shrink-0 disabled:opacity-50 ${
                            mode === 'masuk' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          {mode === 'masuk' ? '▶ Catat Masuk' : '◀ Catat Pulang'}
                        </button>
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
          )}
        </div>
      </div>

      {/* ===== MODAL: QR Scan / Input Kode ===== */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className={`p-5 text-white ${mode === 'masuk' ? 'bg-green-500' : 'bg-blue-500'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">📷 Scan QR / Input Kode</h3>
                  <p className="text-sm opacity-80 mt-0.5">Mode: {mode === 'masuk' ? '▶ Catat Masuk' : '◀ Catat Pulang'}</p>
                </div>
                <button onClick={closeQrModal} className="text-white/80 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center">×</button>
              </div>
              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setInputMode('camera'); setQrResult(null); setQrError(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${inputMode === 'camera' ? 'bg-white/25' : 'hover:bg-white/10 opacity-70'}`}
                >
                  📷 Scan Kamera
                </button>
                <button
                  onClick={() => { setInputMode('kode'); setQrResult(null); setQrError(''); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${inputMode === 'kode' ? 'bg-white/25' : 'hover:bg-white/10 opacity-70'}`}
                >
                  ⌨️ Input Kode
                </button>
              </div>
            </div>

            <div className="p-5">
              {/* Camera Mode */}
              {inputMode === 'camera' && !qrResult && (
                <div>
                  {qrError ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
                      <p className="text-red-600 text-sm mb-2">{qrError}</p>
                      <button onClick={() => setInputMode('kode')} className="text-xs text-red-500 underline">
                        Pakai input kode manual →
                      </button>
                    </div>
                  ) : (
                    <div className="relative bg-black rounded-xl overflow-hidden mb-3" style={{ aspectRatio: '4/3' }}>
                      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 relative">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br" />
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 text-center">Arahkan kamera ke QR code kartu siswa</p>
                </div>
              )}

              {/* Kode Mode */}
              {inputMode === 'kode' && !qrResult && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Masukkan <strong>NIS</strong> atau <strong>NISN</strong> siswa:<br />
                    <span className="text-xs text-gray-400">(Bisa juga pakai barcode scanner USB — scan otomatis terdeteksi)</span>
                  </p>
                  <form onSubmit={handleKodeSubmit} className="flex gap-2">
                    <input
                      ref={kodeRef}
                      type="text"
                      value={kodeInput}
                      onChange={(e) => setKodeInput(e.target.value)}
                      placeholder="Ketik atau scan NIS / NISN..."
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      autoComplete="off"
                    />
                    <button type="submit"
                      className={`px-4 py-3 text-white rounded-xl font-bold text-sm ${mode === 'masuk' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                      Cari
                    </button>
                  </form>
                  {qrError && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{qrError}</div>
                  )}
                </div>
              )}

              {/* Hasil lookup siswa */}
              {qrResult && (
                <div>
                  <div className={`border-2 rounded-xl p-4 mb-4 ${mode === 'masuk' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ${mode === 'masuk' ? 'bg-green-500' : 'bg-blue-500'}`}>
                        {qrResult.nama?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-base">{qrResult.nama}</p>
                        <p className="text-xs text-gray-500">{qrResult.nama_kelas} · {qrResult.nama_sekolah}</p>
                        <p className="text-xs text-gray-400">NIS: {qrResult.nis} · NISN: {qrResult.nisn}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRecord(qrResult.id)}
                      disabled={masukMut.isPending || pulangMut.isPending}
                      className={`w-full py-3 text-white rounded-xl font-bold text-sm disabled:opacity-50 ${mode === 'masuk' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                      {(masukMut.isPending || pulangMut.isPending) ? 'Mencatat...' : mode === 'masuk' ? '▶ Catat MASUK Sekolah' : '◀ Catat PULANG Sekolah'}
                    </button>
                  </div>
                  <button onClick={() => { setQrResult(null); setKodeInput(''); }}
                    className="w-full py-2 text-gray-500 text-sm hover:text-gray-700">
                    ← Scan / Input lagi
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
