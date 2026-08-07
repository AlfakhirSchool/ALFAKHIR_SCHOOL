'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    lunas: 'bg-green-50 text-green-700',
    sebagian: 'bg-yellow-50 text-yellow-700',
    belum_bayar: 'bg-red-50 text-red-700',
  };
  const labels: Record<string, string> = { lunas: 'Lunas', sebagian: 'Sebagian', belum_bayar: 'Belum Bayar' };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

const fmt = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const JENIS_BIAYA_OPTIONS = [
  'SPP',
  'Ekskul',
  'Panahan',
  'Robotik',
  'Ekskul Kelas 9',
  'UKT',
  'Uang Masuk',
  'Formulir Pendaftaran',
  'Pengeluaran Harian',
  'Pembayaran Kas',
  'Transfer',
  'Pengeluaran SD',
  'Pengeluaran SMP',
  'Lainnya',
];

function JenisBiayaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isCustom = value !== '' && !JENIS_BIAYA_OPTIONS.includes(value);
  const [showCustom, setShowCustom] = useState(isCustom);
  return (
    <div className="space-y-2">
      <select
        value={showCustom ? 'Lainnya' : value}
        onChange={e => {
          if (e.target.value === 'Lainnya') { setShowCustom(true); onChange(''); }
          else { setShowCustom(false); onChange(e.target.value); }
        }}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]">
        <option value="">-- Pilih Jenis Biaya --</option>
        {JENIS_BIAYA_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
      </select>
      {showCustom && (
        <input value={value} onChange={e => onChange(e.target.value)}
          placeholder="Ketik jenis biaya..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
      )}
    </div>
  );
}

export default function PembayaranPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ jenis_biaya: '', nominal_biaya: '', tanggal_jatuh_tempo: '', status: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bayarItem, setBayarItem] = useState<any>(null);
  const [bayarForm, setBayarForm] = useState({ nominal_bayar: '', bank: 'tunai', reference_number: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ siswa_id: '', jenis_biaya: '', nominal_biaya: '', tanggal_jatuh_tempo: '', va_bank: '', tahun_ajaran: '2024/2025' });

  const { data, isLoading } = useQuery({
    queryKey: ['pembayaran', filterStatus, page],
    queryFn: () => api.get('/pembayaran', { params: { status: filterStatus || undefined, page, limit: 20 } }).then(r => r.data),
  });

  const { data: laporan } = useQuery({
    queryKey: ['pembayaran-laporan'],
    queryFn: () => api.get('/pembayaran/laporan').then(r => r.data),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-all'],
    queryFn: () => api.get('/siswa', { params: { limit: 500 } }).then(r => r.data.data || []),
    enabled: showAdd,
  });

  const pembayaranList = data?.data || [];
  const summary = laporan?.summary || {};

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['pembayaran'] });
    qc.invalidateQueries({ queryKey: ['pembayaran-laporan'] });
  };

  const openEdit = (p: any) => {
    setEditItem(p);
    setEditForm({
      jenis_biaya: p.jenis_biaya,
      nominal_biaya: String(p.nominal_biaya),
      tanggal_jatuh_tempo: p.tanggal_jatuh_tempo ? p.tanggal_jatuh_tempo.split('T')[0] : '',
      status: p.status,
    });
  };

  const updateMut = useMutation({
    mutationFn: () => api.put(`/pembayaran/${editItem.id}`, {
      ...editForm,
      nominal_biaya: Number(editForm.nominal_biaya),
    }),
    onSuccess: () => { invalidate(); setEditItem(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/pembayaran/${id}`),
    onSuccess: () => { invalidate(); setDeleteId(null); },
  });

  const bayarMut = useMutation({
    mutationFn: () => api.post(`/pembayaran/${bayarItem.id}/bayar`, {
      nominal_bayar: Number(bayarForm.nominal_bayar),
      bank: bayarForm.bank,
      reference_number: bayarForm.reference_number || undefined,
    }),
    onSuccess: () => { invalidate(); setBayarItem(null); setBayarForm({ nominal_bayar: '', bank: 'tunai', reference_number: '' }); },
  });

  const addMut = useMutation({
    mutationFn: () => api.post('/pembayaran', { ...addForm, nominal_biaya: Number(addForm.nominal_biaya) }),
    onSuccess: () => { invalidate(); setShowAdd(false); setAddForm({ siswa_id: '', jenis_biaya: '', nominal_biaya: '', tanggal_jatuh_tempo: '', va_bank: '', tahun_ajaran: '2024/2025' }); },
  });

  return (
    <div>
      <Header title="Manajemen Pembayaran" />
      <div className="p-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#3B7FD1]">
            <p className="text-sm text-gray-500">Total Tagihan</p>
            <p className="text-xl font-bold text-[#1A2332]">{fmt(summary.total_tagihan || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Total Terbayar</p>
            <p className="text-xl font-bold text-green-600">{fmt(summary.total_terbayar || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Total Tunggakan</p>
            <p className="text-xl font-bold text-red-600">{fmt(summary.total_tunggakan || 0)}</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex gap-4 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
          >
            <option value="">Semua Status</option>
            <option value="belum_bayar">Belum Bayar</option>
            <option value="sebagian">Sebagian</option>
            <option value="lunas">Lunas</option>
          </select>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium">
            + Buat Tagihan
          </button>
          <button className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">Export Excel</button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Siswa</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Jenis Biaya</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Tagihan</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Terbayar</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Jatuh Tempo</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : pembayaranList.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada data pembayaran</td></tr>
              ) : pembayaranList.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-800">{p.siswa?.user?.nama}</td>
                  <td className="px-6 py-4 text-gray-600">{p.jenis_biaya}</td>
                  <td className="px-6 py-4 text-gray-800">{fmt(p.nominal_biaya)}</td>
                  <td className="px-6 py-4 text-green-600">{fmt(p.nominal_terbayar)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {p.tanggal_jatuh_tempo ? new Date(p.tanggal_jatuh_tempo).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      {p.status !== 'lunas' && (
                        <button
                          onClick={() => { setBayarItem(p); setBayarForm({ nominal_bayar: String(p.nominal_biaya - p.nominal_terbayar), bank: 'tunai', reference_number: '' }); }}
                          className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 font-medium"
                        >
                          Bayar
                        </button>
                      )}
                      <button onClick={() => openEdit(p)} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 font-medium">
                        Edit
                      </button>
                      <button onClick={() => setDeleteId(p.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(() => {
          const pagination = (data as any)?.pagination;
          if (!pagination || pagination.totalPages <= 1) return null;
          return (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-sm text-gray-500">
                Halaman {pagination.page} dari {pagination.totalPages} · Total {pagination.total} data
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                  ← Sebelumnya
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                  Selanjutnya →
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modal Buat Tagihan */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1A2332]">Buat Tagihan Baru</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Siswa <span className="text-red-500">*</span></label>
                <select value={addForm.siswa_id} onChange={e => setAddForm({ ...addForm, siswa_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- Pilih Siswa --</option>
                  {(siswaList as any[]).map((s: any) => (
                    <option key={s.id} value={s.id}>{s.user?.nama} — {s.kelas?.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Biaya <span className="text-red-500">*</span></label>
                <JenisBiayaSelect value={addForm.jenis_biaya} onChange={v => setAddForm({ ...addForm, jenis_biaya: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nominal (Rp) <span className="text-red-500">*</span></label>
                  <input type="number" value={addForm.nominal_biaya} onChange={e => setAddForm({ ...addForm, nominal_biaya: e.target.value })}
                    placeholder="500000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tahun Ajaran</label>
                  <input value={addForm.tahun_ajaran} onChange={e => setAddForm({ ...addForm, tahun_ajaran: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jatuh Tempo</label>
                <input type="date" value={addForm.tanggal_jatuh_tempo} onChange={e => setAddForm({ ...addForm, tanggal_jatuh_tempo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => addMut.mutate()} disabled={addMut.isPending || !addForm.siswa_id || !addForm.jenis_biaya || !addForm.nominal_biaya}
                className="flex-1 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50">
                {addMut.isPending ? 'Menyimpan...' : 'Buat Tagihan'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Tagihan */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1A2332]">Edit Tagihan</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Siswa: <span className="font-medium text-gray-800">{editItem.siswa?.user?.nama}</span></p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Biaya</label>
                <JenisBiayaSelect value={editForm.jenis_biaya} onChange={v => setEditForm({ ...editForm, jenis_biaya: v })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nominal (Rp)</label>
                <input type="number" value={editForm.nominal_biaya} onChange={e => setEditForm({ ...editForm, nominal_biaya: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jatuh Tempo</label>
                <input type="date" value={editForm.tanggal_jatuh_tempo} onChange={e => setEditForm({ ...editForm, tanggal_jatuh_tempo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="belum_bayar">Belum Bayar</option>
                  <option value="sebagian">Sebagian</option>
                  <option value="lunas">Lunas</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
                className="flex-1 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50">
                {updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setEditItem(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Bayar */}
      {bayarItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1A2332]">Catat Pembayaran</h2>
              <button onClick={() => setBayarItem(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                {bayarItem.siswa?.user?.nama} — {bayarItem.jenis_biaya}<br/>
                <span className="text-gray-400 text-xs">Sisa: {fmt(bayarItem.nominal_biaya - bayarItem.nominal_terbayar)}</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nominal Bayar (Rp)</label>
                <input type="number" value={bayarForm.nominal_bayar} onChange={e => setBayarForm({ ...bayarForm, nominal_bayar: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Metode Bayar</label>
                <select value={bayarForm.bank} onChange={e => setBayarForm({ ...bayarForm, bank: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="tunai">Tunai</option>
                  <option value="bca">BCA Transfer</option>
                  <option value="mandiri">Mandiri Transfer</option>
                  <option value="bni">BNI Transfer</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">No. Referensi (opsional)</label>
                <input value={bayarForm.reference_number} onChange={e => setBayarForm({ ...bayarForm, reference_number: e.target.value })}
                  placeholder="No. transaksi bank"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => bayarMut.mutate()} disabled={bayarMut.isPending || !bayarForm.nominal_bayar}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {bayarMut.isPending ? 'Mencatat...' : 'Catat Bayar'}
              </button>
              <button onClick={() => setBayarItem(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Hapus */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Hapus Tagihan?</h3>
              <p className="text-sm text-gray-500 mb-6">Tagihan dan riwayat pembayarannya akan dihapus permanen.</p>
              <div className="flex gap-3">
                <button onClick={() => deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                  {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
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
