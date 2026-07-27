'use client';

import { useState } from 'react';
import { MapPin, ClipboardList, CheckCircle, XCircle, AlertCircle, FileText, Pencil } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const STATUS_STYLE: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700',
  sakit: 'bg-blue-100 text-blue-700',
  izin:  'bg-yellow-100 text-yellow-700',
  alfa:  'bg-red-100 text-red-700',
};
const STATUS_LABEL: Record<string, string> = {
  hadir: 'Hadir', sakit: 'Sakit', izin: 'Izin', alfa: 'Alfa',
};

function fmtTime(ts: string | null) {
  if (!ts) return '-';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

export default function AbsensiKelasPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [kelas_id, setKelasId] = useState('');
  const [tanggal, setTanggal] = useState(today);
  const [editRow, setEditRow] = useState<any>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editKet, setEditKet] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [statusOverride, setStatusOverride] = useState<Record<string, string>>({});

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-all'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: rekap, isLoading } = useQuery({
    queryKey: ['rekap-kelas', kelas_id, tanggal],
    queryFn: () => kelas_id
      ? api.get('/absensi-gerbang/rekap-kelas', { params: { kelas_id, tanggal } }).then(r => r.data)
      : null,
    enabled: !!kelas_id,
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const ketMut = useMutation({
    mutationFn: (body: any) => api.put('/absensi-gerbang/keterangan', body),
    onSuccess: () => {
      showToast('Keterangan disimpan');
      setEditRow(null);
      qc.invalidateQueries({ queryKey: ['rekap-kelas'] });
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal menyimpan', 'error'),
  });

  const bulkKelasMut = useMutation({
    mutationFn: (absensi: Array<{ siswa_id: string; status: string }>) =>
      api.post('/absensi/bulk-kelas', { kelas_id, tanggal, absensi }),
    onSuccess: (res) => { showToast(res.data.message || 'Berhasil diterapkan ke semua mata pelajaran'); setStatusOverride({}); },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal menerapkan', 'error'),
  });

  const hapusKetMut = useMutation({
    mutationFn: ({ siswa_id, tanggal: tgl }: any) =>
      api.delete('/absensi-gerbang/keterangan', { params: { siswa_id, tanggal: tgl } }),
    onSuccess: () => {
      showToast('Keterangan dihapus, status kembali otomatis');
      qc.invalidateQueries({ queryKey: ['rekap-kelas'] });
    },
    onError: (e: any) => showToast(e.response?.data?.message || 'Gagal hapus', 'error'),
  });

  const openEdit = (row: any) => {
    setEditRow(row);
    setEditStatus(row.keterangan_status || '');
    setEditKet(row.keterangan || '');
  };

  const saveKet = () => {
    if (!editRow) return;
    ketMut.mutate({ siswa_id: editRow.siswa_id, tanggal, status: editStatus || null, keterangan: editKet });
  };

  const summary = rekap?.summary || {};
  const rows: any[] = rekap?.data || [];

  return (
    <div>
      <Header title="Absensi Kelas" />
      <div className="p-6 space-y-5">

        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <CheckCircle size={16} className="inline mr-1" /> : <XCircle size={16} className="inline mr-1" />}{toast.msg}
          </div>
        )}

        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
          <p className="font-semibold"><MapPin size={14} className="inline mr-1" />Sistem Absensi Terpadu</p>
          <p className="mt-1">Kehadiran dihitung dari <strong>absensi gerbang</strong> (scan QR masuk). Siswa yang scan = Hadir. Admin jenjang dapat menambah keterangan Sakit / Izin / Alfa.</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-[#1A2332] mb-4">Pilih Kelas & Tanggal</h3>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Kelas</label>
              <select
                value={kelas_id}
                onChange={(e) => setKelasId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <option value="">— Pilih Kelas —</option>
                {kelasList.map((k: any) => (
                  <option key={k.id} value={k.id}>{k.nama} ({k.sekolah?.nama || k.jenjang})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        {rekap && (
          <div className="grid grid-cols-4 gap-3">
            {(['hadir', 'sakit', 'izin', 'alfa'] as const).map((s) => (
              <div key={s} className={`rounded-xl p-4 border-l-4 shadow-sm bg-white ${
                s === 'hadir' ? 'border-green-500' : s === 'sakit' ? 'border-blue-500' : s === 'izin' ? 'border-yellow-500' : 'border-red-500'
              }`}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{STATUS_LABEL[s]}</p>
                <p className={`text-2xl font-bold mt-1 ${
                  s === 'hadir' ? 'text-green-600' : s === 'sakit' ? 'text-blue-600' : s === 'izin' ? 'text-yellow-600' : 'text-red-600'
                }`}>{summary[s] || 0}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabel */}
        {!kelas_id ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400">
            <p className="mb-3 flex justify-center"><ClipboardList size={40} className="text-gray-300" /></p>
            <p className="text-sm">Pilih kelas untuk melihat rekap kehadiran</p>
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">Memuat data...</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-bold text-[#1A2332]">
                  Rekap — {new Date(tanggal + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{rows.length} siswa</p>
              </div>
              {rows.length > 0 && (
                <button
                  onClick={() => {
                    const absensi = rows.map((r: any) => ({
                      siswa_id: r.siswa_id,
                      status: statusOverride[r.siswa_id] || r.keterangan_status || r.status || 'alfa',
                    }));
                    bulkKelasMut.mutate(absensi);
                  }}
                  disabled={bulkKelasMut.isPending}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                >
                  {bulkKelasMut.isPending ? 'Menerapkan...' : '✓ Terapkan ke Semua Mata Pelajaran'}
                </button>
              )}
            </div>
            {rows.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">Tidak ada siswa di kelas ini</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">Nama Siswa</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">NIS</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Waktu Scan</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Keterangan</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Set Status</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r: any) => (
                      <tr key={r.siswa_id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-[#1A2332]">{r.nama_siswa}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.nis || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-500'}`}>
                            {STATUS_LABEL[r.status] || r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">
                          {r.waktu_masuk
                            ? <span className="text-green-600 font-medium">{fmtTime(r.waktu_masuk)}</span>
                            : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                          {r.keterangan
                            ? <div><p>{r.keterangan}</p><p className="text-gray-300 mt-0.5">oleh {r.keterangan_oleh || '?'}</p></div>
                            : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            {(['hadir', 'sakit', 'izin', 'alfa'] as const).map(s => {
                              const cur = statusOverride[r.siswa_id] || r.keterangan_status || r.status || 'alfa';
                              return (
                                <button key={s} onClick={() => setStatusOverride(prev => ({ ...prev, [r.siswa_id]: s }))}
                                  className={`px-2 py-1 text-xs rounded-lg font-semibold border transition-colors ${cur === s
                                    ? s === 'hadir' ? 'bg-green-100 text-green-700 border-green-300'
                                    : s === 'sakit' ? 'bg-blue-100 text-blue-700 border-blue-300'
                                    : s === 'izin'  ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                    : 'bg-red-100 text-red-700 border-red-300'
                                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}>
                                  {s[0].toUpperCase()}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={() => openEdit(r)}
                              className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs rounded-lg hover:bg-teal-100 font-medium"
                            >
                              <Pencil size={12} className="inline mr-1" />Ket
                            </button>
                            {r.keterangan_status && (
                              <button
                                onClick={() => hapusKetMut.mutate({ siswa_id: r.siswa_id, tanggal })}
                                className="px-2 py-1.5 bg-gray-50 text-gray-500 text-xs rounded-lg hover:bg-gray-100"
                                title="Reset ke otomatis"
                              >✕</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal keterangan */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg text-[#1A2332]">Set Keterangan</h3>
                <p className="text-sm text-gray-500">{editRow.nama_siswa}</p>
              </div>
              <button onClick={() => setEditRow(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status Kehadiran</label>
                <div className="grid grid-cols-4 gap-2">
                  {['', 'sakit', 'izin', 'alfa'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-colors ${
                        editStatus === s
                          ? s === ''     ? 'border-green-400 bg-green-50 text-green-700'
                          : s === 'sakit' ? 'border-blue-400 bg-blue-50 text-blue-700'
                          : s === 'izin'  ? 'border-yellow-400 bg-yellow-50 text-yellow-700'
                                          : 'border-red-400 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {s === '' ? <span className="flex items-center justify-center gap-1"><CheckCircle size={12} />Auto</span> : STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {editStatus === ''
                    ? 'Status otomatis: Hadir jika scan gerbang, Alfa jika tidak'
                    : `Override: status dicatat sebagai ${editStatus}`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Keterangan <span className="font-normal text-gray-400">(opsional)</span>
                </label>
                <textarea
                  value={editKet}
                  onChange={(e) => setEditKet(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Sakit demam, ada surat dokter / Izin keperluan keluarga / dll"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={saveKet}
                  disabled={ketMut.isPending}
                  className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {ketMut.isPending ? 'Menyimpan...' : 'Simpan Keterangan'}
                </button>
                <button
                  onClick={() => setEditRow(null)}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
