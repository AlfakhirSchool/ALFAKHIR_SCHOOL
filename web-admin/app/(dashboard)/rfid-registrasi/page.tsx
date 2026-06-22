'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

type SiswaRow = { id: string; nama: string; nis: string; rfid_uid: string | null; nama_kelas: string; nama_sekolah: string };

export default function RfidRegistrasiPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sekolahId, setSekolahId] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [filterKartu, setFilterKartu] = useState<'semua' | 'belum' | 'sudah'>('semua');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal state
  const [modalSiswa, setModalSiswa] = useState<SiswaRow | null>(null);
  const [manualUid, setManualUid] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanCountdown, setScanCountdown] = useState(0);
  const scanTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: sekolahList = [] } = useQuery({
    queryKey: ['sekolah-list'],
    queryFn: () => api.get('/siswa/sekolah-list').then(r => r.data.data || []).catch(() => []),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-rfid', sekolahId],
    queryFn: () => api.get('/kelas', { params: { sekolah_id: sekolahId } }).then(r => r.data.data || []),
    enabled: !!sekolahId,
  });

  const { data: siswaList = [], isLoading } = useQuery<SiswaRow[]>({
    queryKey: ['rfid-siswa', sekolahId, kelasId, search],
    queryFn: () => api.get('/absensi-gerbang/rfid-siswa', {
      params: { sekolah_id: sekolahId || undefined, kelas_id: kelasId || undefined, q: search || undefined }
    }).then(r => r.data.data || []),
  });

  const filteredSiswa = siswaList.filter(s => {
    if (filterKartu === 'belum') return !s.rfid_uid;
    if (filterKartu === 'sudah') return !!s.rfid_uid;
    return true;
  });

  const sudah = siswaList.filter(s => !!s.rfid_uid).length;
  const belum = siswaList.filter(s => !s.rfid_uid).length;

  // Mulai scan — aktifkan listen mode di backend, poll tiap 2 detik
  const startScan = async () => {
    try {
      await api.post('/absensi-gerbang/rfid-listen');
      setScanning(true);
      setScanCountdown(30);

      scanTimer.current = setInterval(() => {
        setScanCountdown(prev => {
          if (prev <= 1) {
            stopScan();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      pollTimer.current = setInterval(async () => {
        try {
          const res = await api.get('/absensi-gerbang/rfid-captured');
          if (res.data.success && res.data.rfid_uid) {
            setManualUid(res.data.rfid_uid);
            stopScan();
          }
        } catch {}
      }, 2000);
    } catch {
      showToast('Gagal mengaktifkan mode scan', 'error');
    }
  };

  const stopScan = () => {
    setScanning(false);
    setScanCountdown(0);
    if (scanTimer.current) clearInterval(scanTimer.current);
    if (pollTimer.current) clearInterval(pollTimer.current);
  };

  useEffect(() => () => stopScan(), []);

  const assignMut = useMutation({
    mutationFn: ({ siswa_id, rfid_uid }: { siswa_id: string; rfid_uid: string }) =>
      api.post('/absensi-gerbang/rfid-assign', { siswa_id, rfid_uid }),
    onSuccess: () => {
      showToast('Kartu berhasil didaftarkan');
      qc.invalidateQueries({ queryKey: ['rfid-siswa'] });
      closeModal();
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal mendaftarkan kartu', 'error'),
  });

  const removeMut = useMutation({
    mutationFn: (siswa_id: string) => api.delete(`/absensi-gerbang/rfid-assign/${siswa_id}`),
    onSuccess: () => {
      showToast('Kartu berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['rfid-siswa'] });
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal menghapus kartu', 'error'),
  });

  const openModal = (siswa: SiswaRow) => {
    setModalSiswa(siswa);
    setManualUid(siswa.rfid_uid || '');
    setScanning(false);
    setScanCountdown(0);
  };

  const closeModal = () => {
    stopScan();
    setModalSiswa(null);
    setManualUid('');
  };

  return (
    <div>
      <Header title="Registrasi Kartu RFID" />
      <div className="p-6 space-y-5">

        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.msg}
          </div>
        )}

        {/* Info panel */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
          <h2 className="font-bold text-lg mb-1">Pendaftaran Kartu ID RFID</h2>
          <p className="text-sm opacity-80">Setiap siswa perlu didaftarkan kartu ID card-nya sekali. Setelah didaftarkan, siswa cukup tap kartu di terminal untuk absensi otomatis.</p>
          <div className="mt-3 flex gap-4 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">✅ Terdaftar: {sudah}</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">⏳ Belum: {belum}</span>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <select value={sekolahId} onChange={e => { setSekolahId(e.target.value); setKelasId(''); }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">— Semua Sekolah —</option>
              {sekolahList.map((s: any) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
            <select value={kelasId} onChange={e => setKelasId(e.target.value)} disabled={!sekolahId}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50">
              <option value="">— Semua Kelas —</option>
              {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            <div className="flex gap-1.5">
              {(['semua', 'belum', 'sudah'] as const).map(f => (
                <button key={f} onClick={() => setFilterKartu(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${filterKartu === f ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                  {f === 'semua' ? 'Semua' : f === 'belum' ? '⏳ Belum' : '✅ Sudah'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabel siswa */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Memuat data...</div>
          ) : filteredSiswa.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Tidak ada data siswa</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 text-left">Nama Siswa</th>
                  <th className="px-5 py-3 text-left">Kelas</th>
                  <th className="px-5 py-3 text-left">Status Kartu</th>
                  <th className="px-5 py-3 text-left">UID Kartu</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSiswa.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#1A2332]">{s.nama}</p>
                      <p className="text-xs text-gray-400">NIS: {s.nis}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{s.nama_kelas}</td>
                    <td className="px-5 py-3">
                      {s.rfid_uid
                        ? <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">✅ Terdaftar</span>
                        : <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">⏳ Belum</span>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{s.rfid_uid || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(s)}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium">
                          {s.rfid_uid ? 'Ganti' : 'Daftarkan'}
                        </button>
                        {s.rfid_uid && (
                          <button onClick={() => removeMut.mutate(s.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg font-medium">
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Daftarkan Kartu */}
        {modalSiswa && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-bold text-[#1A2332] text-lg">Daftarkan Kartu RFID</h3>
                <p className="text-sm text-gray-500 mt-0.5">{modalSiswa.nama} · {modalSiswa.nama_kelas}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Cara scan via terminal */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-700 mb-1">Cara 1: Scan via Terminal RFID</p>
                  <p className="text-xs text-blue-600 mb-3">Aktifkan mode scan, lalu minta siswa tap kartu ke terminal ESP32. UID akan terdeteksi otomatis.</p>
                  {!scanning ? (
                    <button onClick={startScan}
                      className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-bold">
                      📡 Mulai Scan (30 detik)
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="w-14 h-14 mx-auto mb-2 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold animate-pulse">
                        {scanCountdown}
                      </div>
                      <p className="text-sm text-blue-700 font-medium">Menunggu tap kartu...</p>
                      <button onClick={stopScan} className="mt-2 text-xs text-blue-500 underline">Batalkan</button>
                    </div>
                  )}
                </div>

                {/* Input manual */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1.5">Cara 2: Input UID Manual</p>
                  <p className="text-xs text-gray-400 mb-2">Baca UID dari layar terminal ESP32, ketik di sini.</p>
                  <input
                    type="text"
                    value={manualUid}
                    onChange={e => setManualUid(e.target.value.toUpperCase())}
                    placeholder="Contoh: A3B2C1D0 atau A3:B2:C1:D0"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button onClick={closeModal}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm">
                  Batal
                </button>
                <button
                  onClick={() => assignMut.mutate({ siswa_id: modalSiswa.id, rfid_uid: manualUid.trim() })}
                  disabled={!manualUid.trim() || assignMut.isPending}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                  {assignMut.isPending ? 'Menyimpan...' : '💾 Simpan Kartu'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
