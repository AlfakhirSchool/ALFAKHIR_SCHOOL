'use client';

import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { CheckCircle, AlertCircle, FileText, XCircle, Download, QrCode, MapPin, AlertTriangle, Smartphone } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const STATUS_STYLE: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700 border-green-300',
  sakit: 'bg-blue-100 text-blue-700 border-blue-300',
  izin:  'bg-yellow-100 text-yellow-700 border-yellow-300',
  alfa:  'bg-red-100 text-red-700 border-red-300',
};
const STATUS_ICON: Record<string, import('react').ReactNode> = {
  hadir: <CheckCircle size={14} className="inline" />,
  sakit: <AlertCircle size={14} className="inline" />,
  izin:  <FileText size={14} className="inline" />,
  alfa:  <XCircle size={14} className="inline" />,
};

type AbsensiRow = { siswa_id: string; nama_siswa: string; nis: string; status_gate: string; ket_gate: string; absensi_id: string | null; status_guru: string | null; catatan: string | null };

export default function AbsensiGuruPage() {
  const { user } = useAuthStore();
  const today = new Date().toISOString().split('T')[0];
  const [step, setStep] = useState<'select' | 'input' | 'done'>('select');
  const [jadwalId, setJadwalId] = useState('');
  const [tanggal, setTanggal] = useState(today);
  const [kelasId, setKelasId] = useState('');
  const [rows, setRows] = useState<AbsensiRow[]>([]);
  const [jadwalInfo, setJadwalInfo] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [qrModal, setQrModal] = useState<{ image: string; sessionId: string; code: string } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: kelasList = [] } = useQuery({
    queryKey: ['my-kelas', user?.id],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
    enabled: !!user,
    staleTime: 0,
  });

  const { data: jadwalList = [] } = useQuery({
    queryKey: ['jadwal-kelas', kelasId],
    queryFn: () => api.get('/jadwal-pelajaran', { params: { kelas_id: kelasId } }).then(r => r.data.data || []),
    enabled: !!kelasId,
  });

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  useEffect(() => {
    if (!jadwalList.length) return;
    const hariIni = HARI[new Date().getDay()];
    const jadwalHariIni = (jadwalList as any[]).find(j => j.hari === hariIni);
    if (jadwalHariIni) setJadwalId(jadwalHariIni.id);
  }, [jadwalList]);

  const loadPersiapan = useMutation({
    mutationFn: () => api.get('/absensi/persiapan-guru', { params: { jadwal_pelajaran_id: jadwalId, tanggal } }),
    onSuccess: (res) => {
      const d = res.data;
      setJadwalInfo(d.jadwal);
      // Inisialisasi: pakai status_guru jika sudah direkam, else pakai status_gate
      setRows(d.data.map((r: AbsensiRow) => ({
        ...r,
        status_guru: r.status_guru || r.status_gate,
      })));
      setStep('input');
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal memuat data', 'error'),
  });

  const qrMut = useMutation({
    mutationFn: () => api.post('/absensi/qr-session/create', { jadwal_pelajaran_id: jadwalId, tanggal }),
    onSuccess: (res) => {
      const d = res.data.data;
      setQrModal({ image: d.qr_image, sessionId: d.id, code: d.unique_code });
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal buat QR', 'error'),
  });

  const closeQrMut = useMutation({
    mutationFn: (sessionId: string) => api.post(`/absensi/qr-session/${sessionId}/close`),
    onSuccess: () => { setQrModal(null); showToast('QR session ditutup'); },
  });

  const submitMut = useMutation({
    mutationFn: () => api.post('/absensi/bulk-guru', {
      jadwal_pelajaran_id: jadwalId,
      tanggal,
      absensi: rows.map(r => ({ siswa_id: r.siswa_id, status: r.status_guru || 'alfa', catatan: r.catatan || '' })),
    }),
    onSuccess: () => {
      showToast('Absensi berhasil disimpan');
      setStep('done');
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal menyimpan', 'error'),
  });

  const updateRow = (siswaId: string, field: 'status_guru' | 'catatan', value: string) => {
    setRows(prev => prev.map(r => r.siswa_id === siswaId ? { ...r, [field]: value } : r));
  };

  const downloadRekap = async (kId: string, tgl: string) => {
    const d = new Date(tgl);
    const bulan = d.getMonth() + 1;
    const tahun = d.getFullYear();
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${base}/absensi/rekap-download?kelas_id=${kId}&bulan=${bulan}&tahun=${tahun}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { showToast('Gagal download rekap', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'rekap.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = rows.reduce((acc, r) => {
    const s = r.status_guru || 'alfa';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <Header title="Absensi per Pelajaran" />
      <div className="p-6 space-y-5">

        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.msg}
          </div>
        )}

        {/* Step 1: Pilih jadwal */}
        {step === 'select' && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
            <h2 className="font-bold text-[#1A2332] mb-5">Pilih Kelas & Pelajaran</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kelas</label>
                <select
                  value={kelasId}
                  onChange={(e) => { setKelasId(e.target.value); setJadwalId(''); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">— Pilih Kelas —</option>
                  {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jadwal Pelajaran</label>
                <select
                  value={jadwalId}
                  onChange={(e) => setJadwalId(e.target.value)}
                  disabled={!kelasId}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50"
                >
                  <option value="">— Pilih Jadwal —</option>
                  {jadwalList.map((j: any) => (
                    <option key={j.id} value={j.id}>
                      {j.mata_pelajaran?.nama || j.mataPelajaran?.nama} · {j.hari} {j.jam_mulai}–{j.jam_selesai}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
              <button
                onClick={() => loadPersiapan.mutate()}
                disabled={!jadwalId || loadPersiapan.isPending}
                className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {loadPersiapan.isPending ? 'Memuat...' : 'Buka Daftar Absensi →'}
              </button>
              {kelasId && (
                <button
                  onClick={() => downloadRekap(kelasId, tanggal)}
                  className="w-full py-2.5 border border-teal-500 text-teal-600 hover:bg-teal-50 rounded-xl font-semibold text-sm"
                >
                  <Download size={14} className="inline mr-1" />Download Rekap Bulan Ini (Excel)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Input absensi */}
        {step === 'input' && (
          <div className="space-y-4">
            {/* Info jadwal */}
            <div className="bg-teal-500 text-white rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{jadwalInfo?.mata_pelajaran?.nama}</p>
                  <p className="text-sm opacity-80">{jadwalInfo?.kelas?.nama} · {jadwalInfo?.hari} {jadwalInfo?.jam_mulai}–{jadwalInfo?.jam_selesai}</p>
                  <p className="text-sm opacity-80 mt-0.5">{new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button onClick={() => setStep('select')} className="text-white/70 hover:text-white text-sm underline">← Ganti</button>
                  <button
                    onClick={() => qrMut.mutate()}
                    disabled={qrMut.isPending}
                    className="bg-white text-teal-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-teal-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {qrMut.isPending ? '...' : <span className="flex items-center gap-1"><QrCode size={14} />Tampilkan QR</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-3">
              {['hadir', 'sakit', 'izin', 'alfa'].map(s => (
                <div key={s} className={`rounded-xl p-3 text-center border ${STATUS_STYLE[s]}`}>
                  <p className="text-xl font-bold">{summary[s] || 0}</p>
                  <p className="text-xs mt-0.5">{STATUS_ICON[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</p>
                </div>
              ))}
            </div>

            {/* Daftar siswa */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 text-sm text-gray-500 flex gap-2">
                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded flex items-center gap-1"><MapPin size={12} />= dari gate scan</span>
                <span className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded">Guru bisa ubah status per siswa</span>
              </div>
              <div className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <div key={r.siswa_id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1A2332] text-sm">{r.nama_siswa}</p>
                        <p className="text-xs text-gray-400">NIS: {r.nis}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Gate: <span className={`font-medium ${r.status_gate === 'hadir' ? 'text-green-600' : 'text-red-500'}`}>{r.status_gate}</span>
                          {r.ket_gate && <span className="ml-1 text-gray-300">({r.ket_gate})</span>}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {/* Toggle status */}
                        <div className="flex gap-1.5">
                          {['hadir', 'izin', 'sakit', 'alfa'].map(s => (
                            <button
                              key={s}
                              onClick={() => updateRow(r.siswa_id, 'status_guru', s)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                                r.status_guru === s ? STATUS_STYLE[s] : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {STATUS_ICON[s]} {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                        {/* Catatan — tampil hanya jika bukan hadir */}
                        {r.status_guru !== 'hadir' && (
                          <input
                            type="text"
                            value={r.catatan || ''}
                            onChange={(e) => updateRow(r.siswa_id, 'catatan', e.target.value)}
                            placeholder="Catatan keterangan (opsional)"
                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-400 w-full max-w-xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => submitMut.mutate()}
              disabled={submitMut.isPending}
              className="w-full py-4 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-base disabled:opacity-50"
            >
              {submitMut.isPending ? 'Menyimpan...' : `Simpan Absensi ${rows.length} Siswa`}
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="mb-4 flex justify-center"><CheckCircle size={56} className="text-green-500" /></p>
            <h2 className="text-xl font-bold text-[#1A2332] mb-2">Absensi Tersimpan</h2>
            <p className="text-gray-500 text-sm mb-6">{jadwalInfo?.mata_pelajaran?.nama} · {rows.length} siswa</p>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {['hadir', 'sakit', 'izin', 'alfa'].map(s => (
                <div key={s} className={`rounded-xl p-4 border ${STATUS_STYLE[s]}`}>
                  <p className="text-2xl font-bold">{summary[s] || 0}</p>
                  <p className="text-xs mt-1">{STATUS_ICON[s]} {s.charAt(0).toUpperCase() + s.slice(1)}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setStep('select'); setJadwalId(''); setRows([]); setJadwalInfo(null); }}
              className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold"
            >
              Absensi Pelajaran Lain
            </button>
          </div>
        )}
      </div>

      {/* Modal QR */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center overflow-hidden">
            <div className="bg-teal-500 p-5 text-white">
              <p className="font-bold text-lg flex items-center justify-center gap-2"><Smartphone size={18} />QR Absensi Siswa</p>
              <p className="text-sm opacity-80 mt-1">{jadwalInfo?.mata_pelajaran?.nama} · {jadwalInfo?.kelas?.nama}</p>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">Minta siswa scan QR ini untuk absen hadir</p>
              <img src={qrModal.image} alt="QR Code" className="w-56 h-56 mx-auto border-4 border-teal-100 rounded-xl" />
              <div className="mt-4 bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Kode manual:</p>
                <p className="text-3xl font-black tracking-widest text-teal-600 mt-1">{qrModal.code}</p>
              </div>
              <p className="text-xs text-amber-600 mt-3 flex items-center justify-center gap-1"><AlertTriangle size={12} />Tutup QR setelah semua siswa scan</p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => closeQrMut.mutate(qrModal.sessionId)}
                  disabled={closeQrMut.isPending}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {closeQrMut.isPending ? 'Menutup...' : <><Lock size={14} className="inline mr-1" />Tutup QR</>}
                </button>
                <button
                  onClick={() => setQrModal(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-sm hover:bg-gray-50"
                >
                  Minimize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
