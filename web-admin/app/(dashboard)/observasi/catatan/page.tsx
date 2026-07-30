'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown, ChevronUp, Filter, FileText } from 'lucide-react';
import api from '@/lib/api';

type Kandidat = {
  id: string; nama: string; nama_diperbaiki: string | null; level: string;
  status: string; pewawancara_nama: string | null; rekomendasi: string | null;
};
type Catatan = {
  id: string; isi: string; rekomendasi: string | null; pewawancara_nama: string | null;
  created_at: string; updated_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  DITERIMA: '#16A34A', DITOLAK: '#DC2626', REVIEW: '#D97706', PENDING: '#6B7280',
};
const REKOM_COLOR: Record<string, string> = {
  DITERIMA: '#16A34A', DITOLAK: '#DC2626', LANJUT: '#2563EB',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

function KandidatRow({ k }: { k: Kandidat }) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useQuery<Catatan[]>({
    queryKey: ['catatan', k.id],
    queryFn: async () => {
      const r = await api.get(`/catatan-pewawancara/kandidat/${k.id}`);
      return r.data.data || [];
    },
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{k.nama_diperbaiki || k.nama}</span>
            <span className="text-xs text-gray-400">{k.level}</span>
            {k.pewawancara_nama && (
              <span className="text-xs text-gray-400">· {k.pewawancara_nama}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: STATUS_COLOR[k.status] || '#6B7280', backgroundColor: `${STATUS_COLOR[k.status] || '#6B7280'}15` }}>
              {k.status}
            </span>
            {k.rekomendasi && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: REKOM_COLOR[k.rekomendasi] || '#6B7280', backgroundColor: `${REKOM_COLOR[k.rekomendasi] || '#6B7280'}15` }}>
                Rekom: {k.rekomendasi}
              </span>
            )}
          </div>
        </div>
        <div className="text-gray-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 space-y-3">
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <div className="w-4 h-4 border-2 border-[#1B8B87] border-t-transparent rounded-full animate-spin" />
              Memuat catatan...
            </div>
          )}
          {!isFetching && (!data || data.length === 0) && (
            <p className="text-sm text-gray-400 py-2">Belum ada catatan untuk kandidat ini.</p>
          )}
          {data?.map(c => (
            <div key={c.id} className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">{c.pewawancara_nama || '—'}</span>
                  {c.rekomendasi && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: REKOM_COLOR[c.rekomendasi] || '#6B7280', backgroundColor: `${REKOM_COLOR[c.rekomendasi] || '#6B7280'}15` }}>
                      {c.rekomendasi}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{c.isi}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SemualCatatanPage() {
  const [filterPewawancara, setFilterPewawancara] = useState('');
  const [filterRekomendasi, setFilterRekomendasi] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['kandidat-all-for-catatan'],
    queryFn: async () => {
      const r = await api.get('/kandidat', { params: { limit: 200 } });
      return (r.data.data || []) as Kandidat[];
    },
    staleTime: 60_000,
  });

  // Only show kandidat with pewawancara or rekomendasi (they have catatan)
  const withCatatan = (data || []).filter(k => k.pewawancara_nama);

  const filtered = withCatatan.filter(k => {
    if (filterPewawancara && k.pewawancara_nama !== filterPewawancara) return false;
    if (filterRekomendasi && k.rekomendasi !== filterRekomendasi) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  const pewawancaraList = [...new Set(withCatatan.map(k => k.pewawancara_nama).filter(Boolean))] as string[];

  // Chart data
  const chartData = [
    { name: 'DITERIMA', value: filtered.filter(k => k.rekomendasi === 'DITERIMA').length, color: '#16A34A' },
    { name: 'LANJUT', value: filtered.filter(k => k.rekomendasi === 'LANJUT').length, color: '#2563EB' },
    { name: 'DITOLAK', value: filtered.filter(k => k.rekomendasi === 'DITOLAK').length, color: '#DC2626' },
    { name: 'Belum', value: filtered.filter(k => !k.rekomendasi).length, color: '#9CA3AF' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1B8B87]/10 flex items-center justify-center">
          <FileText size={20} className="text-[#1B8B87]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Semua Catatan Pewawancara</h1>
          <p className="text-sm text-gray-500">{filtered.length} kandidat dengan catatan</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribusi Rekomendasi</h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={chartData} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        <select
          value={filterPewawancara}
          onChange={e => { setFilterPewawancara(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B8B87]/20"
        >
          <option value="">Semua Pewawancara</option>
          {pewawancaraList.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filterRekomendasi}
          onChange={e => { setFilterRekomendasi(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B8B87]/20"
        >
          <option value="">Semua Rekomendasi</option>
          <option value="DITERIMA">DITERIMA</option>
          <option value="LANJUT">LANJUT</option>
          <option value="DITOLAK">DITOLAK</option>
        </select>
        {(filterPewawancara || filterRekomendasi) && (
          <button onClick={() => { setFilterPewawancara(''); setFilterRekomendasi(''); setPage(1); }}
            className="text-xs text-[#1B8B87] hover:underline">Reset</button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#1B8B87] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p>Tidak ada catatan ditemukan.</p>
            </div>
          ) : (
            paginated.map(k => <KandidatRow key={k.id} k={k} />)
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
