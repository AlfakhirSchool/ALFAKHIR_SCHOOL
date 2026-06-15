'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    lunas: 'bg-green-50 text-green-700',
    sebagian: 'bg-yellow-50 text-yellow-700',
    belum_bayar: 'bg-red-50 text-red-700',
  };
  const labels: Record<string, string> = {
    lunas: 'Lunas',
    sebagian: 'Sebagian',
    belum_bayar: 'Belum Bayar',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-50 text-gray-700'}`}>
      {labels[status] || status}
    </span>
  );
};

export default function PembayaranPage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['pembayaran', filterStatus, page],
    queryFn: () => api.get('/pembayaran', { params: { status: filterStatus || undefined, page, limit: 20 } }).then(r => r.data),
  });

  const { data: laporan } = useQuery({
    queryKey: ['pembayaran-laporan'],
    queryFn: () => api.get('/pembayaran/laporan').then(r => r.data),
  });

  const pembayaranList = data?.data || [];
  const summary = laporan?.summary || {};

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div>
      <Header title="Manajemen Pembayaran" />
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-[#3B7FD1]">
            <p className="text-sm text-gray-500">Total Tagihan</p>
            <p className="text-xl font-bold text-[#1A2332]">{formatCurrency(summary.total_tagihan || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-500">Total Terbayar</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.total_terbayar || 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-red-500">
            <p className="text-sm text-gray-500">Total Tunggakan</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(summary.total_tunggakan || 0)}</p>
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
          <button className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] font-medium">
            + Buat Tagihan
          </button>
          <button className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50">
            Export Excel
          </button>
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
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Virtual Account</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : pembayaranList.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Tidak ada data pembayaran</td></tr>
              ) : pembayaranList.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-800">{p.siswa?.user?.nama}</td>
                  <td className="px-6 py-4 text-gray-600">{p.jenis_biaya}</td>
                  <td className="px-6 py-4 text-gray-800">{formatCurrency(p.nominal_biaya)}</td>
                  <td className="px-6 py-4 text-green-600">{formatCurrency(p.nominal_terbayar)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {p.tanggal_jatuh_tempo ? new Date(p.tanggal_jatuh_tempo).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">
                    {p.virtual_account ? `${p.va_bank?.toUpperCase()} ${p.virtual_account}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[#3B7FD1] hover:underline text-xs">Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
