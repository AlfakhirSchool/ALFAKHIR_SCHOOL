'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function AbsensiPage() {
  const qc = useQueryClient();
  const [step, setStep] = useState<'select' | 'session' | 'recap'>('select');
  const [form, setForm] = useState({ kelas_id: '', jadwal_pelajaran_id: '' });
  const [activeSession, setActiveSession] = useState<any>(null);
  const [manualInput, setManualInput] = useState({ siswa_id: '', status: 'hadir', catatan: '' });
  const [showManual, setShowManual] = useState(false);

  const { data: kelasList } = useQuery({
    queryKey: ['my-kelas'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: jadwalList } = useQuery({
    queryKey: ['jadwal-kelas', form.kelas_id],
    queryFn: () => api.get('/jadwal-pelajaran', { params: { kelas_id: form.kelas_id } }).then(r => r.data.data || []),
    enabled: !!form.kelas_id,
  });

  const { data: absensiData, refetch: refetchAbsensi } = useQuery({
    queryKey: ['absensi-session', activeSession?.id],
    queryFn: () => api.get('/absensi/laporan', {
      params: { jadwal_pelajaran_id: form.jadwal_pelajaran_id, tanggal: new Date().toISOString().split('T')[0] }
    }).then(r => r.data.data || []),
    enabled: !!activeSession,
    refetchInterval: 5000,
  });

  const createSession = useMutation({
    mutationFn: () => api.post('/absensi/qr-session/create', {
      jadwal_pelajaran_id: form.jadwal_pelajaran_id,
      tanggal: new Date().toISOString().split('T')[0],
    }),
    onSuccess: (res) => {
      setActiveSession(res.data.data);
      setStep('session');
    },
  });

  const closeSession = useMutation({
    mutationFn: () => api.post(`/absensi/qr-session/${activeSession.id}/close`),
    onSuccess: () => {
      setStep('recap');
    },
  });

  const addManual = useMutation({
    mutationFn: () => api.post('/absensi/manual', {
      ...manualInput,
      jadwal_pelajaran_id: form.jadwal_pelajaran_id,
      tanggal: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      setManualInput({ siswa_id: '', status: 'hadir', catatan: '' });
      setShowManual(false);
      refetchAbsensi();
    },
  });

  const hadir = absensiData?.filter((a: any) => a.status === 'hadir').length || 0;
  const alfa = absensiData?.filter((a: any) => a.status === 'alfa').length || 0;
  const sakit = absensiData?.filter((a: any) => a.status === 'sakit').length || 0;
  const izin = absensiData?.filter((a: any) => a.status === 'izin').length || 0;

  return (
    <div>
      <Header title="Absensi" />
      <div className="p-6 max-w-4xl">

        {step === 'select' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1A2332] mb-6">Mulai Sesi Absensi</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kelas</label>
                <select
                  value={form.kelas_id}
                  onChange={(e) => setForm({ ...form, kelas_id: e.target.value, jadwal_pelajaran_id: '' })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {(kelasList || []).map((k: any) => (
                    <option key={k.id} value={k.id}>{k.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Jadwal Pelajaran</label>
                <select
                  value={form.jadwal_pelajaran_id}
                  onChange={(e) => setForm({ ...form, jadwal_pelajaran_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                  disabled={!form.kelas_id}
                >
                  <option value="">-- Pilih Jadwal --</option>
                  {(jadwalList || []).map((j: any) => (
                    <option key={j.id} value={j.id}>
                      {j.mataPelajaran?.nama} · {j.hari} {j.jam_mulai}–{j.jam_selesai}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => createSession.mutate()}
                disabled={!form.jadwal_pelajaran_id || createSession.isPending}
                className="w-full py-3 bg-[#1B8B87] text-white rounded-lg font-semibold hover:bg-[#156f6c] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createSession.isPending ? 'Membuat sesi...' : 'Generate QR & Mulai Absensi'}
              </button>
            </div>
          </div>
        )}

        {step === 'session' && activeSession && (
          <div className="space-y-6">
            {/* QR & Code display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <h3 className="font-semibold text-[#1A2332] mb-4">QR Code Absensi</h3>
                {activeSession.qr_image ? (
                  <img
                    src={activeSession.qr_image}
                    alt="QR Absensi"
                    className="w-48 h-48 mx-auto border-4 border-[#1B8B87] rounded-xl"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    QR tidak tersedia
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">Siswa scan QR ini dengan aplikasi</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <h3 className="font-semibold text-[#1A2332] mb-4">Kode Manual (6 Digit)</h3>
                <div className="text-6xl font-bold tracking-widest text-[#1B8B87] py-8 bg-[#1B8B87]/5 rounded-xl">
                  {activeSession.unique_code}
                </div>
                <p className="text-xs text-gray-400 mt-3">Siswa ketik kode ini jika tidak bisa scan QR</p>
              </div>
            </div>

            {/* Real-time attendance list */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1A2332]">Rekap Kehadiran (Auto-refresh)</h3>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-600 font-medium">Hadir: {hadir}</span>
                  <span className="text-red-600 font-medium">Alfa: {alfa}</span>
                  <span className="text-blue-600 font-medium">Sakit: {sakit}</span>
                  <span className="text-yellow-600 font-medium">Izin: {izin}</span>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {(absensiData || []).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-3">
                    <span className="text-sm font-medium text-gray-800">{a.siswa?.user?.nama}</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      a.status === 'hadir' ? 'bg-green-50 text-green-700' :
                      a.status === 'sakit' ? 'bg-blue-50 text-blue-700' :
                      a.status === 'izin' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                ))}
                {(absensiData || []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Menunggu siswa absen...</p>
                )}
              </div>
            </div>

            {/* Manual input */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <button
                onClick={() => setShowManual(!showManual)}
                className="text-sm text-[#1B8B87] hover:underline font-medium"
              >
                {showManual ? '▼' : '▶'} Input Manual Absensi
              </button>
              {showManual && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <input
                    placeholder="ID Siswa"
                    value={manualInput.siswa_id}
                    onChange={(e) => setManualInput({ ...manualInput, siswa_id: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#1B8B87]"
                  />
                  <select
                    value={manualInput.status}
                    onChange={(e) => setManualInput({ ...manualInput, status: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="hadir">Hadir</option>
                    <option value="sakit">Sakit</option>
                    <option value="izin">Izin</option>
                    <option value="alfa">Alfa</option>
                  </select>
                  <button
                    onClick={() => addManual.mutate()}
                    disabled={!manualInput.siswa_id || addManual.isPending}
                    className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Simpan
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => closeSession.mutate()}
              disabled={closeSession.isPending}
              className="w-full py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {closeSession.isPending ? 'Menutup...' : 'Tutup Sesi Absensi'}
            </button>
          </div>
        )}

        {step === 'recap' && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-[#1A2332] mb-2">Sesi Absensi Selesai</h2>
            <div className="grid grid-cols-4 gap-4 my-6">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600">{hadir}</p>
                <p className="text-xs text-gray-500 mt-1">Hadir</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-blue-600">{sakit}</p>
                <p className="text-xs text-gray-500 mt-1">Sakit</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-yellow-600">{izin}</p>
                <p className="text-xs text-gray-500 mt-1">Izin</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-red-600">{alfa}</p>
                <p className="text-xs text-gray-500 mt-1">Alfa</p>
              </div>
            </div>
            <button
              onClick={() => { setStep('select'); setActiveSession(null); setForm({ kelas_id: '', jadwal_pelajaran_id: '' }); }}
              className="px-6 py-3 bg-[#1B8B87] text-white rounded-lg font-semibold hover:bg-[#156f6c]"
            >
              Absensi Baru
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
