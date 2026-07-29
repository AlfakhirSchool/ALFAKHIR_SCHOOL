'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Kandidat = {
  id: string;
  name: string;
  level: 'SD' | 'SMP' | 'SMA';
  status: string;
  room: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  academicScore: number | null;
  recommendation: string | null;
  interviewer: string | null;
  createdAt: string;
};

type Stats = { total: number; completed: number; pending: number; diterima: number };

type Kelas = { id: string; nama: string; tahun_ajaran: string };

const LEVEL_COLOR: Record<string, string> = { SD: '#F97316', SMP: '#1B8B87', SMA: '#3B82F6' };

export default function ObservasiPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [kandidat, setKandidat] = useState<Kandidat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('COMPLETED');

  // Modal daftarkan
  const [modal, setModal] = useState<Kandidat | null>(null);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [daftarLoading, setDaftarLoading] = useState(false);
  const [daftarResult, setDaftarResult] = useState<{ email: string; password: string } | null>(null);

  const levelFromUser = user?.school_level || '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { status: filterStatus };
      if (filterLevel) params.level = filterLevel;
      else if (levelFromUser) params.level = levelFromUser;
      const res = await api.get('/observasi/kandidat', { params });
      setStats(res.data.stats);
      setKandidat(res.data.candidates || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Gagal memuat data observasi');
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterStatus, levelFromUser]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function openModal(k: Kandidat) {
    setModal(k);
    setSelectedKelas('');
    setDaftarResult(null);
    try {
      const res = await api.get('/kelas', { params: { jenjang: k.level, limit: 100 } });
      setKelasList(res.data.data || []);
    } catch {
      setKelasList([]);
    }
  }

  async function handleDaftarkan() {
    if (!modal || !selectedKelas) return;
    setDaftarLoading(true);
    try {
      const res = await api.post('/observasi/daftarkan', {
        kandidat_id: modal.id,
        nama: modal.name,
        kelas_id: selectedKelas,
      });
      setDaftarResult({ email: res.data.email, password: res.data.password });
      fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Gagal mendaftarkan');
    } finally {
      setDaftarLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Penerimaan Siswa Baru" />
      <div className="p-6 max-w-6xl mx-auto">

        {/* Source badge */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-medium">
            🔗 Data dari Sistem Observasi Al Fakhir
          </span>
          <button onClick={fetchData} className="text-xs text-gray-400 hover:text-gray-600">Perbarui</button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Kandidat', value: stats.total, color: '#6B7280' },
              { label: 'Selesai Observasi', value: stats.completed, color: '#1B8B87' },
              { label: 'Diterima', value: stats.diterima, color: '#16A34A' },
              { label: 'Menunggu', value: stats.pending, color: '#D97706' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="COMPLETED">Selesai Observasi</option>
            <option value="REVIEWED">Sudah Direview</option>
            <option value="RESPONSE_RECEIVED">Sudah Isi Form</option>
            <option value="PENDING">Menunggu</option>
          </select>
          {!levelFromUser && (
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Semua Jenjang</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Memuat data dari sistem observasi...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={fetchData} className="mt-3 text-xs text-teal-600 hover:underline">Coba lagi</button>
            </div>
          ) : kandidat.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm text-gray-500">Tidak ada kandidat untuk filter ini</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jenjang</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Skor Akademik</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rekomendasi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pewawancara</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kandidat.map(k => (
                  <tr key={k.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{k.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[k.level] || '#6B7280' }}>
                        {k.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {k.academicScore != null ? `${k.academicScore.toFixed(0)}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {k.recommendation === 'Terima' ? (
                        <span className="text-green-600 font-medium">✓ Terima</span>
                      ) : k.recommendation ? (
                        <span className="text-red-500">{k.recommendation}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{k.interviewer || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {k.recommendation === 'Terima' && (
                        <button
                          onClick={() => openModal(k)}
                          className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors font-medium"
                        >
                          Daftarkan →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Daftarkan sebagai Siswa</h2>
              <p className="text-sm text-gray-500 mt-0.5">{modal.name} · {modal.level}</p>
            </div>
            <div className="p-5">
              {daftarResult ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-700 mb-2">✓ Berhasil didaftarkan!</p>
                  <p className="text-xs text-gray-600">Email: <span className="font-mono font-medium">{daftarResult.email}</span></p>
                  <p className="text-xs text-gray-600 mt-1">Password: <span className="font-mono font-medium">{daftarResult.password}</span></p>
                  <p className="text-xs text-gray-400 mt-2">Simpan dan bagikan ke siswa/wali.</p>
                </div>
              ) : (
                <>
                  <label className="text-sm text-gray-600 font-medium block mb-1.5">Pilih Kelas</label>
                  <select
                    value={selectedKelas}
                    onChange={e => setSelectedKelas(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">— Pilih kelas —</option>
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.nama} ({k.tahun_ajaran})</option>
                    ))}
                  </select>
                  {kelasList.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1.5">Belum ada kelas untuk jenjang {modal.level}. Buat kelas terlebih dahulu.</p>
                  )}
                </>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2 justify-end">
              <button
                onClick={() => { setModal(null); setDaftarResult(null); }}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
              >
                {daftarResult ? 'Tutup' : 'Batal'}
              </button>
              {!daftarResult && (
                <button
                  onClick={handleDaftarkan}
                  disabled={!selectedKelas || daftarLoading}
                  className="text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {daftarLoading ? 'Mendaftarkan...' : 'Daftarkan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
