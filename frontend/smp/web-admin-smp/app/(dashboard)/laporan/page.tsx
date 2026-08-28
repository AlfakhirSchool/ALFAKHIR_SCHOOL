'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<'rapor' | 'absensi' | 'nilai' | 'pembayaran'>('rapor');
  const [raporFilter, setRaporFilter] = useState({ kelas_id: '', semester: '1', tahun_ajaran: '2024/2025' });
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');

  const { data: kelasList } = useQuery({ queryKey: ['kelas-all'], queryFn: () => api.get('/kelas').then((r: any) => r.data.data || []) });

  const generateRapor = useMutation({
    mutationFn: () => api.post('/rapor/generate', raporFilter),
    onMutate: () => { setGenerating(true); setMsg(''); },
    onSuccess: () => setMsg('Rapor berhasil digenerate!'),
    onError: (e: any) => setMsg(e.response?.data?.message || 'Gagal generate rapor'),
    onSettled: () => setGenerating(false),
  });

  const tabs = [
    { key: 'rapor', label: '📄 Rapor', desc: 'Generate rapor per kelas / siswa' },
    { key: 'absensi', label: '✅ Absensi', desc: 'Laporan rekap kehadiran' },
    { key: 'nilai', label: '📝 Nilai', desc: 'Statistik dan distribusi nilai' },
    { key: 'pembayaran', label: '💰 Pembayaran', desc: 'Rekapitulasi pembayaran SPP' },
  ] as const;

  return (
    <div>
      <Header title="Laporan & Export" />
      <div className="p-6">
        {/* Tab Nav */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-[#3B7FD1] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'rapor' && (
          <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl">
            <h2 className="font-semibold text-[#1A2332] mb-1">Generate Rapor Siswa</h2>
            <p className="text-sm text-gray-500 mb-6">Generate rapor PDF untuk seluruh siswa per kelas per semester.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                <select value={raporFilter.kelas_id} onChange={(e) => setRaporFilter({ ...raporFilter, kelas_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
                  <option value="">Semua Kelas</option>
                  {(kelasList || []).map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select value={raporFilter.semester} onChange={(e) => setRaporFilter({ ...raporFilter, semester: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
                  <input value={raporFilter.tahun_ajaran} onChange={(e) => setRaporFilter({ ...raporFilter, tahun_ajaran: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
                    placeholder="2024/2025" />
                </div>
              </div>

              {msg && (
                <div className={`px-4 py-3 rounded-lg text-sm ${msg.includes('berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {msg}
                </div>
              )}

              <button onClick={() => generateRapor.mutate()} disabled={generating}
                className="px-6 py-3 bg-[#3B7FD1] text-white rounded-lg font-semibold hover:bg-[#2d6ab5] disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate Rapor PDF'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'absensi' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-2">Rekap Bulanan per Kelas</h3>
              <p className="text-sm text-gray-500 mb-4">Export ringkasan kehadiran setiap kelas per bulan.</p>
              <button className="px-5 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5]">
                Download Excel
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-2">Rekap Semester per Siswa</h3>
              <p className="text-sm text-gray-500 mb-4">Rekap kehadiran seluruh siswa untuk satu semester.</p>
              <button className="px-5 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5]">
                Download Excel
              </button>
            </div>
          </div>
        )}

        {activeTab === 'nilai' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-2">Export Nilai per Kelas</h3>
              <p className="text-sm text-gray-500 mb-4">Download seluruh nilai siswa untuk satu kelas.</p>
              <button className="px-5 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5]">
                Download Excel
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-2">Statistik Nilai</h3>
              <p className="text-sm text-gray-500 mb-4">Distribusi grade A/B/C/D/E per mata pelajaran.</p>
              <button className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                Lihat Statistik
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pembayaran' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-2">Laporan Pembayaran Bulanan</h3>
              <p className="text-sm text-gray-500 mb-4">Rekap pemasukan SPP per bulan.</p>
              <button className="px-5 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5]">
                Download Excel
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-[#1A2332] mb-2">Daftar Tunggakan</h3>
              <p className="text-sm text-gray-500 mb-4">List siswa dengan tunggakan pembayaran.</p>
              <button className="px-5 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                Download Tunggakan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
