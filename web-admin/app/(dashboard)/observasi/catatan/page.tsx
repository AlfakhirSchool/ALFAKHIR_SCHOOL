'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Filter, FileText, Search, User } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

type Kandidat = {
  id: string; nama: string; nama_diperbaiki: string | null; level: string;
  status: string; pewawancara_nama: string | null; rekomendasi: string | null;
};
type Catatan = {
  id: string; pewawancara_nama: string | null; rekomendasi: string | null;
  observasi: string | null; penilaian_akademik: string | null;
  dukungan_keluarga: string | null; catatan_karakter: string | null;
  catatan_lain: string | null; created_at: string;
};

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  DITERIMA: { bg: '#F0FDF4', text: '#16A34A', label: 'Diterima' },
  DITOLAK:  { bg: '#FEF2F2', text: '#DC2626', label: 'Ditolak' },
  REVIEW:   { bg: '#EFF6FF', text: '#2563EB', label: 'Wawancara' },
  PENDING:  { bg: '#F9FAFB', text: '#6B7280', label: 'Menunggu' },
};
const REKOM_COLOR: Record<string, { bg: string; text: string }> = {
  DITERIMA:      { bg: '#F0FDF4', text: '#16A34A' },
  DITOLAK:       { bg: '#FEF2F2', text: '#DC2626' },
  LANJUT:        { bg: '#EFF6FF', text: '#2563EB' },
  Terima:        { bg: '#F0FDF4', text: '#16A34A' },
  Tolak:         { bg: '#FEF2F2', text: '#DC2626' },
  Pertimbangkan: { bg: '#FFFBEB', text: '#D97706' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

function CatatanDetail({ c }: { c: Catatan }) {
  const fields = [
    ['Observasi', c.observasi],
    ['Penilaian Akademik', c.penilaian_akademik],
    ['Dukungan Keluarga', c.dukungan_keluarga],
    ['Karakter', c.catatan_karakter],
    ['Catatan Lain', c.catatan_lain],
  ].filter(([, v]) => v);

  const rk = REKOM_COLOR[c.rekomendasi || ''];

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
            <User size={13} className="text-teal-600" />
          </div>
          <span className="text-sm font-semibold text-slate-700">{c.pewawancara_nama || 'Anonim'}</span>
        </div>
        <div className="flex items-center gap-2">
          {c.rekomendasi && rk && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: rk.bg, color: rk.text }}>
              {c.rekomendasi}
            </span>
          )}
          <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
        </div>
      </div>
      {fields.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {fields.map(([label, value]) => (
            <div key={label} className="text-sm">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
              <p className="text-slate-700 mt-0.5 leading-relaxed whitespace-pre-line">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 italic">Tidak ada isi catatan.</p>
      )}
    </div>
  );
}

function KandidatRow({ k }: { k: Kandidat }) {
  const [open, setOpen] = useState(false);
  const { data: catatanList = [], isFetching } = useQuery<Catatan[]>({
    queryKey: ['catatan', k.id],
    queryFn: () => api.get(`/catatan-pewawancara/kandidat/${k.id}`).then(r => r.data.data || []),
    enabled: open,
    staleTime: 30_000,
  });

  const st = STATUS_COLOR[k.status] || STATUS_COLOR.PENDING;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <button onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
          style={{ backgroundColor: `${st.text}15`, color: st.text }}>
          {(k.nama_diperbaiki || k.nama).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{k.nama_diperbaiki || k.nama}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ backgroundColor: k.level === 'SD' ? '#FFF7ED' : k.level === 'SMP' ? '#F0FDFA' : '#EFF6FF',
                       color: k.level === 'SD' ? '#C2440E' : k.level === 'SMP' ? '#0F766E' : '#1D4ED8' }}>
              {k.level}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
              style={{ backgroundColor: st.bg, color: st.text, borderColor: `${st.text}30` }}>
              {st.label}
            </span>
          </div>
          {k.pewawancara_nama && (
            <p className="text-xs text-slate-400 mt-0.5">Pewawancara: {k.pewawancara_nama}</p>
          )}
        </div>
        <div className="text-slate-400 shrink-0">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
              <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              Memuat catatan...
            </div>
          )}
          {!isFetching && catatanList.length === 0 && (
            <p className="text-sm text-slate-400 py-2 text-center italic">Belum ada catatan untuk kandidat ini.</p>
          )}
          {catatanList.map(c => <CatatanDetail key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}

export default function SemuaCatatanPage() {
  const [filterPewawancara, setFilterPewawancara] = useState('');
  const [filterRekomendasi, setFilterRekomendasi] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data = [], isLoading } = useQuery<Kandidat[]>({
    queryKey: ['kandidat-all-catatan'],
    queryFn: () => api.get('/kandidat', { params: { limit: 500 } }).then(r => r.data.data || []),
    staleTime: 60_000,
  });

  const pewawancaraList = [...new Set(data.map(k => k.pewawancara_nama).filter(Boolean))] as string[];

  const filtered = data.filter(k => {
    if (filterPewawancara && k.pewawancara_nama !== filterPewawancara) return false;
    if (filterRekomendasi && k.rekomendasi !== filterRekomendasi) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(k.nama_diperbaiki || k.nama).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return (
    <div>
      <Header title="Semua Catatan Pewawancara" />
      <div className="p-6 space-y-5 max-w-4xl mx-auto">

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama kandidat..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-400 bg-slate-50" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select value={filterPewawancara} onChange={e => { setFilterPewawancara(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-teal-400">
              <option value="">Semua Pewawancara</option>
              {pewawancaraList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterRekomendasi} onChange={e => { setFilterRekomendasi(e.target.value); setPage(1); }}
              className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-teal-400">
              <option value="">Semua Rekomendasi</option>
              <option value="Terima">Terima</option>
              <option value="Pertimbangkan">Pertimbangkan</option>
              <option value="Tolak">Tolak</option>
              <option value="DITERIMA">DITERIMA</option>
              <option value="DITOLAK">DITOLAK</option>
            </select>
          </div>
          {(filterPewawancara || filterRekomendasi || search) && (
            <button onClick={() => { setFilterPewawancara(''); setFilterRekomendasi(''); setSearch(''); setPage(1); }}
              className="text-xs text-teal-600 hover:underline font-medium">Reset</button>
          )}
        </div>

        <p className="text-xs text-slate-400">{filtered.length} kandidat ditampilkan</p>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
            <FileText size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 font-medium">Tidak ada kandidat ditemukan</p>
            <p className="text-xs text-slate-300 mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginated.map(k => <KandidatRow key={k.id} k={k} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 font-medium">
              ← Prev
            </button>
            <span className="text-sm text-slate-500 px-2">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 text-sm rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-50 font-medium">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
