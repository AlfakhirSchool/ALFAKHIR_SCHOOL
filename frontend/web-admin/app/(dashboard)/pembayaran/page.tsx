'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import {
  Search, Plus, Zap, BookOpen, Dumbbell, Target, Bot, GraduationCap,
  Landmark, DoorOpen, FileText, Wallet, CreditCard, ArrowLeftRight,
  School, Building2, MoreHorizontal, ChevronLeft, ChevronRight,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';

// ─── Preset nominal per jenis biaya ──────────────────────────────────────────
// Ubah nilai di sini sesuai tarif sekolah
const PRESETS: Record<string, { sd?: number; smp?: number; default?: number; label: string; desc: string; icon: any; color: string }> = {
  'SPP':                  { sd: 650_000,   smp: 750_000,   label: 'SPP',                  desc: 'Bayaran rutin bulanan',            icon: BookOpen,      color: 'text-blue-600 bg-blue-50' },
  'Panahan':              { sd: 200_000,   smp: 200_000,   label: 'Ekskul Panahan',        desc: 'Kegiatan panahan bulanan',         icon: Target,        color: 'text-orange-600 bg-orange-50' },
  'Robotik':              { sd: 250_000,   smp: 250_000,   label: 'Ekskul Robotik',        desc: 'Kegiatan robotik bulanan',         icon: Bot,           color: 'text-purple-600 bg-purple-50' },
  'Ekskul Kelas 9':       { default: 150_000,              label: 'Ekskul Kelas 9',        desc: 'Kegiatan ekskul kelas 9',          icon: Dumbbell,      color: 'text-teal-600 bg-teal-50' },
  'Ekskul':               { sd: 200_000,   smp: 200_000,   label: 'Ekskul',                desc: 'Kegiatan ekstrakurikuler',         icon: Dumbbell,      color: 'text-green-600 bg-green-50' },
  'UKT':                  { sd: 500_000,   smp: 600_000,   label: 'UKT',                   desc: 'Uang Kegiatan Tahunan',            icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50' },
  'Uang Masuk':           { sd: 5_000_000, smp: 6_000_000, label: 'Uang Masuk / DSP',     desc: 'Dana Sumbangan Pembangunan',       icon: Landmark,      color: 'text-rose-600 bg-rose-50' },
  'Formulir Pendaftaran': { default: 150_000,              label: 'Formulir Pendaftaran',  desc: 'Biaya formulir PPDB',              icon: FileText,      color: 'text-amber-600 bg-amber-50' },
  'Lainnya':              { default: 0,                    label: 'Lainnya',               desc: 'Jenis biaya lainnya',              icon: MoreHorizontal,color: 'text-gray-600 bg-gray-50' },
};

const JENIS_PEMASUKAN = ['SPP', 'Panahan', 'Robotik', 'Ekskul Kelas 9', 'Ekskul', 'UKT', 'Uang Masuk', 'Formulir Pendaftaran', 'Lainnya'];

const fmtRp = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
const fmtShort = (v: number) =>
  v >= 1_000_000 ? `Rp ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)} jt`
  : v >= 1_000 ? `Rp ${(v / 1_000).toFixed(0)} rb` : `Rp ${v}`;

// ─── Badge ────────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, [string, string, any]> = {
    lunas:      ['bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', 'Lunas', CheckCircle2],
    sebagian:   ['bg-amber-50 text-amber-700 ring-1 ring-amber-200',       'Sebagian', Clock],
    belum_bayar:['bg-red-50 text-red-700 ring-1 ring-red-200',             'Belum Bayar', AlertCircle],
  };
  const [cls, label, Icon] = map[status] || ['bg-gray-50 text-gray-600 ring-1 ring-gray-200', status, MoreHorizontal];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={10} />
      {label}
    </span>
  );
};

// ─── Siswa autocomplete ───────────────────────────────────────────────────────
function SiswaSearch({ siswaList, value, onChange }: {
  siswaList: any[];
  value: { id: string; label: string; unit?: string } | null;
  onChange: (v: { id: string; label: string; unit?: string } | null) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (value) setQ(value.label); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim() || q === value?.label) return [];
    const lower = q.toLowerCase();
    return siswaList.filter((s: any) => {
      const nama = s.user?.nama?.toLowerCase() || '';
      const nis = s.no_induk?.toLowerCase() || '';
      const kelas = s.kelas?.nama?.toLowerCase() || '';
      return nama.includes(lower) || nis.includes(lower) || kelas.includes(lower);
    }).slice(0, 8);
  }, [q, siswaList, value]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); if (!e.target.value) onChange(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Ketik nama siswa, NIS, atau kelas..."
          className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-gray-50/50"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map((s: any) => {
            const unit = s.kelas?.nama?.startsWith('SD') || s.sekolah?.includes('SD') ? 'SD' : 'SMP';
            return (
              <button key={s.id} type="button"
                onMouseDown={() => {
                  const label = `${s.user?.nama} — ${s.kelas?.nama || s.no_induk || ''}`;
                  onChange({ id: s.id, label, unit });
                  setQ(label);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl transition-colors">
                <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{(s.user?.nama || '?')[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.user?.nama}</p>
                  <p className="text-xs text-gray-400">{s.kelas?.nama} · {s.no_induk}</p>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${unit === 'SD' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>{unit}</span>
              </button>
            );
          })}
        </div>
      )}
      {value && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span className="text-xs text-emerald-600 font-medium">Siswa dipilih</span>
        </div>
      )}
    </div>
  );
}

// ─── Jenis biaya card picker ──────────────────────────────────────────────────
function JenisBiayaPicker({ value, onChange, unit, onNominalHint }: {
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  onNominalHint: (n: number) => void;
}) {
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const select = (key: string) => {
    setUseCustom(false);
    onChange(key);
    const p = PRESETS[key];
    if (p) {
      const amt = unit === 'SD' ? (p.sd ?? p.default ?? 0) : (p.smp ?? p.default ?? 0);
      onNominalHint(amt);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {JENIS_PEMASUKAN.map(key => {
          const p = PRESETS[key];
          const amt = unit === 'SD' ? (p?.sd ?? p?.default) : (p?.smp ?? p?.default);
          const Icon = p?.icon || MoreHorizontal;
          const active = !useCustom && value === key;
          return (
            <button key={key} type="button" onClick={() => select(key)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer
                ${active
                  ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-100'
                  : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-blue-100' : (p?.color?.split(' ')[1] || 'bg-gray-100')}`}>
                <Icon size={15} className={active ? 'text-blue-600' : (p?.color?.split(' ')[0] || 'text-gray-600')} />
              </div>
              <p className={`text-[11px] font-semibold leading-tight ${active ? 'text-blue-700' : 'text-gray-700'}`}>{p?.label || key}</p>
              {amt != null && amt > 0 && (
                <p className={`text-[10px] font-medium ${active ? 'text-blue-500' : 'text-gray-400'}`}>{fmtShort(amt)}</p>
              )}
            </button>
          );
        })}
      </div>
      <div>
        <button type="button"
          onClick={() => { setUseCustom(true); onChange(custom); }}
          className={`w-full text-left px-3 py-2 rounded-xl border-2 text-sm transition-all
            ${useCustom ? 'border-blue-400 bg-blue-50' : 'border-dashed border-gray-200 hover:border-gray-300 text-gray-400'}`}>
          {useCustom ? (
            <input autoFocus value={custom}
              onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
              onClick={e => e.stopPropagation()}
              placeholder="Ketik jenis biaya lain..."
              className="w-full bg-transparent outline-none text-gray-800 text-sm" />
          ) : '+ Jenis lainnya (ketik manual)'}
        </button>
      </div>
    </div>
  );
}

// ─── Nominal input with quick amounts ────────────────────────────────────────
function NominalInput({ value, onChange, hints }: { value: string; onChange: (v: string) => void; hints: number[] }) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">Rp</span>
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-gray-50/50 transition-all"
        />
        {value && Number(value) > 0 && (
          <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{fmtRp(Number(value))}</p>
        )}
      </div>
      {hints.filter(h => h > 0).length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {hints.filter((h, i, a) => h > 0 && a.indexOf(h) === i).map(h => (
            <button key={h} type="button" onClick={() => onChange(String(h))}
              className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors border border-blue-100">
              {fmtShort(h)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const emptyAdd = { jenis_biaya: '', nominal_biaya: '', tanggal_jatuh_tempo: '', tahun_ajaran: '2025/2026' };
const emptyCatat = { jenis_biaya: '', nominal_biaya: '', metode: 'tunai', reference_number: '', tanggal_jatuh_tempo: '', tahun_ajaran: '2025/2026' };

export default function PembayaranPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [page, setPage] = useState(1);

  const [editItem, setEditItem] = useState<any>(null);
  const [editForm, setEditForm] = useState({ jenis_biaya: '', nominal_biaya: '', tanggal_jatuh_tempo: '', status: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bayarItem, setBayarItem] = useState<any>(null);
  const [bayarForm, setBayarForm] = useState({ nominal_bayar: '', bank: 'tunai', reference_number: '' });

  const [showAdd, setShowAdd] = useState(false);
  const [addSiswa, setAddSiswa] = useState<{ id: string; label: string; unit?: string } | null>(null);
  const [addForm, setAddForm] = useState(emptyAdd);

  const [showCatat, setShowCatat] = useState(false);
  const [catatSiswa, setCatatSiswa] = useState<{ id: string; label: string; unit?: string } | null>(null);
  const [catatForm, setCatatForm] = useState(emptyCatat);
  const [catatNominalHints, setCatatNominalHints] = useState<number[]>([]);
  const [catatError, setCatatError] = useState('');

  const needSiswa = showAdd || showCatat;

  const { data, isLoading } = useQuery({
    queryKey: ['pembayaran', filterStatus, filterJenis, page],
    queryFn: () => api.get('/pembayaran', {
      params: { status: filterStatus || undefined, jenis_biaya: filterJenis || undefined, page, limit: 20 },
    }).then(r => r.data),
  });

  const { data: laporan } = useQuery({
    queryKey: ['pembayaran-laporan'],
    queryFn: () => api.get('/pembayaran/laporan').then(r => r.data),
  });

  const { data: siswaList = [] } = useQuery({
    queryKey: ['siswa-all'],
    queryFn: () => api.get('/siswa', { params: { limit: 500 } }).then(r => r.data.data || []),
    enabled: needSiswa,
    staleTime: 300_000,
  });

  const pembayaranList = data?.data || [];
  const summary = laporan?.summary || {};
  const pct = summary.total_tagihan > 0 ? Math.round((summary.total_terbayar / summary.total_tagihan) * 100) : 0;

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
    mutationFn: () => api.put(`/pembayaran/${editItem.id}`, { ...editForm, nominal_biaya: Number(editForm.nominal_biaya) }),
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
    mutationFn: () => api.post('/pembayaran', {
      siswa_id: addSiswa!.id,
      jenis_biaya: addForm.jenis_biaya,
      nominal_biaya: Number(addForm.nominal_biaya),
      tanggal_jatuh_tempo: addForm.tanggal_jatuh_tempo || undefined,
      tahun_ajaran: addForm.tahun_ajaran,
    }),
    onSuccess: () => { invalidate(); setShowAdd(false); setAddSiswa(null); setAddForm(emptyAdd); },
  });

  const catatMut = useMutation({
    mutationFn: async () => {
      setCatatError('');
      const created = await api.post('/pembayaran', {
        siswa_id: catatSiswa!.id,
        jenis_biaya: catatForm.jenis_biaya,
        nominal_biaya: Number(catatForm.nominal_biaya),
        tanggal_jatuh_tempo: catatForm.tanggal_jatuh_tempo || undefined,
        tahun_ajaran: catatForm.tahun_ajaran,
      });
      const id = created.data?.data?.id;
      await api.post(`/pembayaran/${id}/bayar`, {
        nominal_bayar: Number(catatForm.nominal_biaya),
        bank: catatForm.metode,
        reference_number: catatForm.reference_number || undefined,
      });
    },
    onSuccess: () => { invalidate(); setShowCatat(false); setCatatSiswa(null); setCatatForm(emptyCatat); setCatatNominalHints([]); },
    onError: (e: any) => { setCatatError(e?.response?.data?.message || 'Gagal mencatat pembayaran'); },
  });

  // compute hints when siswa unit changes
  const catatHints = useMemo(() => {
    if (!catatForm.jenis_biaya) return catatNominalHints;
    const p = PRESETS[catatForm.jenis_biaya];
    if (!p) return catatNominalHints;
    const u = catatSiswa?.unit;
    const sd = p.sd ?? p.default ?? 0;
    const smp = p.smp ?? p.default ?? 0;
    if (u === 'SD') return [sd].filter(Boolean);
    if (u === 'SMP') return [smp].filter(Boolean);
    return [sd, smp].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
  }, [catatForm.jenis_biaya, catatSiswa?.unit, catatNominalHints]);

  const METODE_OPTIONS = [
    { value: 'tunai', label: 'Tunai', icon: Wallet },
    { value: 'bca', label: 'BCA', icon: CreditCard },
    { value: 'mandiri', label: 'Mandiri', icon: CreditCard },
    { value: 'bni', label: 'BNI', icon: CreditCard },
    { value: 'qris', label: 'QRIS', icon: ArrowLeftRight },
  ];

  return (
    <div className="min-h-screen bg-gray-50/80">
      <Header title="Pembayaran Siswa" />
      <div className="p-5 max-w-7xl mx-auto space-y-5">

        {/* ── Stat cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Tagihan', val: summary.total_tagihan || 0, icon: Landmark, color: 'text-slate-600', ring: 'ring-slate-200', bg: 'bg-slate-50' },
            { label: 'Total Terbayar', val: summary.total_terbayar || 0, icon: TrendingUp, color: 'text-emerald-600', ring: 'ring-emerald-200', bg: 'bg-emerald-50' },
            { label: 'Tunggakan', val: summary.total_tunggakan || 0, icon: AlertCircle, color: 'text-red-600', ring: 'ring-red-200', bg: 'bg-red-50' },
          ].map(({ label, val, icon: Icon, color, ring, bg }) => (
            <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center ring-1 ${ring}`}>
                  <Icon size={17} className={color} />
                </div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              </div>
              <p className={`text-2xl font-black ${color}`}>{fmtRp(val)}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
              <span>Progress Pembayaran</span>
              <span className="font-bold text-blue-600">{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="text-xs text-gray-400 shrink-0">{fmtRp(summary.total_terbayar || 0)} / {fmtRp(summary.total_tagihan || 0)}</p>
        </div>

        {/* ── Action bar ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30">
            <option value="">Semua Status</option>
            <option value="belum_bayar">Belum Bayar</option>
            <option value="sebagian">Sebagian</option>
            <option value="lunas">Lunas</option>
          </select>
          <select value={filterJenis} onChange={e => { setFilterJenis(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30">
            <option value="">Semua Jenis</option>
            {JENIS_PEMASUKAN.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowCatat(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium text-sm shadow-sm shadow-emerald-100 transition-all">
              <Zap size={14} /> Catat Pembayaran
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm shadow-sm shadow-blue-100 transition-all">
              <Plus size={14} /> Buat Tagihan
            </button>
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Siswa</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Jenis Biaya</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Tagihan</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Terbayar</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Jatuh Tempo</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                    <div className="inline-flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-sm">Memuat data...</span>
                    </div>
                  </td></tr>
                ) : pembayaranList.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                    <Wallet size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada data pembayaran</p>
                  </td></tr>
                ) : pembayaranList.map((p: any) => {
                  const pIcon = PRESETS[p.jenis_biaya];
                  const Icon = pIcon?.icon || Wallet;
                  const sisa = p.nominal_biaya - p.nominal_terbayar;
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                            <span className="text-white text-xs font-bold">{(p.siswa?.user?.nama || '?')[0]}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{p.siswa?.user?.nama}</p>
                            <p className="text-xs text-gray-400">{p.siswa?.kelas?.nama || p.siswa?.no_induk}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${pIcon?.color?.split(' ')[1] || 'bg-gray-100'}`}>
                            <Icon size={12} className={pIcon?.color?.split(' ')[0] || 'text-gray-500'} />
                          </div>
                          <span className="text-gray-700 font-medium">{p.jenis_biaya}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-gray-800 font-semibold">{fmtRp(p.nominal_biaya)}</td>
                      <td className="px-5 py-3.5 text-right font-mono">
                        <span className="text-emerald-600 font-semibold">{fmtRp(p.nominal_terbayar)}</span>
                        {sisa > 0 && <p className="text-xs text-red-400">sisa {fmtRp(sisa)}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 text-sm">
                        {p.tanggal_jatuh_tempo ? new Date(p.tanggal_jatuh_tempo).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          {p.status !== 'lunas' && (
                            <button
                              onClick={() => { setBayarItem(p); setBayarForm({ nominal_bayar: String(sisa), bank: 'tunai', reference_number: '' }); }}
                              className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs hover:bg-emerald-100 font-semibold border border-emerald-200 transition-colors">
                              Bayar
                            </button>
                          )}
                          <button onClick={() => openEdit(p)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs hover:bg-blue-100 font-semibold border border-blue-200 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => setDeleteId(p.id)}
                            className="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 font-semibold border border-red-200 transition-colors">
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {(() => {
          const pg = (data as any)?.pagination;
          if (!pg || pg.totalPages <= 1) return null;
          return (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-gray-400">
                Halaman <span className="font-semibold text-gray-700">{pg.page}</span> dari {pg.totalPages} · {pg.total} tagihan
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= pg.totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ════ Modal: Catat Pembayaran Langsung ════════════════════════════════ */}
      {showCatat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Zap size={14} className="text-emerald-600" />
                  </div>
                  <h2 className="font-bold text-gray-900">Catat Pembayaran</h2>
                </div>
                <p className="text-xs text-gray-400">Buat tagihan & langsung catat lunas dalam satu langkah</p>
              </div>
              <button onClick={() => { setShowCatat(false); setCatatError(''); setCatatSiswa(null); setCatatForm(emptyCatat); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Siswa */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Siswa <span className="text-red-400">*</span>
                </label>
                <SiswaSearch siswaList={siswaList as any[]} value={catatSiswa} onChange={v => {
                  setCatatSiswa(v);
                  // re-compute hints if jenis already selected
                  if (v && catatForm.jenis_biaya) {
                    const p = PRESETS[catatForm.jenis_biaya];
                    if (p) {
                      const amt = v.unit === 'SD' ? (p.sd ?? p.default ?? 0) : (p.smp ?? p.default ?? 0);
                      if (amt > 0) setCatatForm(f => ({ ...f, nominal_biaya: String(amt) }));
                      setCatatNominalHints([amt].filter(Boolean));
                    }
                  }
                }} />
              </div>

              {/* Jenis biaya */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Jenis Biaya <span className="text-red-400">*</span>
                </label>
                <JenisBiayaPicker
                  value={catatForm.jenis_biaya}
                  unit={catatSiswa?.unit}
                  onChange={v => setCatatForm(f => ({ ...f, jenis_biaya: v }))}
                  onNominalHint={n => {
                    if (n > 0) setCatatForm(f => ({ ...f, nominal_biaya: String(n) }));
                    setCatatNominalHints([n].filter(Boolean));
                  }}
                />
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Nominal <span className="text-red-400">*</span>
                </label>
                <NominalInput value={catatForm.nominal_biaya} onChange={v => setCatatForm(f => ({ ...f, nominal_biaya: v }))} hints={catatHints} />
              </div>

              {/* Metode */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Metode Pembayaran</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {METODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button"
                      onClick={() => setCatatForm(f => ({ ...f, metode: value }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                        ${catatForm.metode === value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'}`}>
                      <Icon size={14} className={catatForm.metode === value ? 'text-emerald-600' : 'text-gray-500'} />
                      <span className={`text-[10px] font-semibold ${catatForm.metode === value ? 'text-emerald-700' : 'text-gray-500'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference + tanggal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">No. Referensi</label>
                  <input value={catatForm.reference_number}
                    onChange={e => setCatatForm(f => ({ ...f, reference_number: e.target.value }))}
                    placeholder="No. transaksi / QRIS"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-gray-50/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tahun Ajaran</label>
                  <input value={catatForm.tahun_ajaran}
                    onChange={e => setCatatForm(f => ({ ...f, tahun_ajaran: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-gray-50/50" />
                </div>
              </div>

              {catatError && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200">
                  <AlertCircle size={14} /> {catatError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2.5">
              <button
                onClick={() => catatMut.mutate()}
                disabled={catatMut.isPending || !catatSiswa || !catatForm.jenis_biaya || !catatForm.nominal_biaya}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-emerald-100 transition-all">
                {catatMut.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mencatat...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2"><CheckCircle2 size={15} /> Catat Lunas</span>
                )}
              </button>
              <button onClick={() => { setShowCatat(false); setCatatError(''); setCatatSiswa(null); setCatatForm(emptyCatat); }}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 font-medium transition-colors">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Modal: Buat Tagihan ══════════════════════════════════════════════ */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus size={14} className="text-blue-600" />
                </div>
                <h2 className="font-bold text-gray-900">Buat Tagihan Baru</h2>
              </div>
              <button onClick={() => setShowAdd(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Siswa <span className="text-red-400">*</span></label>
                <SiswaSearch siswaList={siswaList as any[]} value={addSiswa} onChange={setAddSiswa} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Jenis Biaya <span className="text-red-400">*</span></label>
                <JenisBiayaPicker
                  value={addForm.jenis_biaya}
                  unit={addSiswa?.unit}
                  onChange={v => setAddForm(f => ({ ...f, jenis_biaya: v }))}
                  onNominalHint={n => { if (n > 0) setAddForm(f => ({ ...f, nominal_biaya: String(n) })); }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nominal (Rp) <span className="text-red-400">*</span></label>
                  <NominalInput value={addForm.nominal_biaya} onChange={v => setAddForm(f => ({ ...f, nominal_biaya: v }))}
                    hints={addSiswa && addForm.jenis_biaya ? (() => {
                      const p = PRESETS[addForm.jenis_biaya];
                      if (!p) return [];
                      return [addSiswa.unit === 'SD' ? (p.sd ?? p.default ?? 0) : (p.smp ?? p.default ?? 0)].filter(Boolean);
                    })() : []} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Tahun Ajaran</label>
                  <input value={addForm.tahun_ajaran} onChange={e => setAddForm(f => ({ ...f, tahun_ajaran: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-gray-50/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Jatuh Tempo</label>
                <input type="date" value={addForm.tanggal_jatuh_tempo}
                  onChange={e => setAddForm(f => ({ ...f, tanggal_jatuh_tempo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-gray-50/50" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2.5">
              <button onClick={() => addMut.mutate()}
                disabled={addMut.isPending || !addSiswa || !addForm.jenis_biaya || !addForm.nominal_biaya}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-100">
                {addMut.isPending ? 'Menyimpan...' : 'Buat Tagihan'}
              </button>
              <button onClick={() => setShowAdd(false)}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 font-medium transition-colors">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Modal: Edit Tagihan ══════════════════════════════════════════════ */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Edit Tagihan</h2>
              <button onClick={() => setEditItem(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{(editItem.siswa?.user?.nama || '?')[0]}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{editItem.siswa?.user?.nama}</p>
                  <p className="text-xs text-gray-400">{editItem.siswa?.kelas?.nama}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Jenis Biaya</label>
                <select value={editForm.jenis_biaya} onChange={e => setEditForm(f => ({ ...f, jenis_biaya: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none">
                  {JENIS_PEMASUKAN.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nominal (Rp)</label>
                <input type="number" value={editForm.nominal_biaya} onChange={e => setEditForm(f => ({ ...f, nominal_biaya: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Jatuh Tempo</label>
                  <input type="date" value={editForm.tanggal_jatuh_tempo} onChange={e => setEditForm(f => ({ ...f, tanggal_jatuh_tempo: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none">
                    <option value="belum_bayar">Belum Bayar</option>
                    <option value="sebagian">Sebagian</option>
                    <option value="lunas">Lunas</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2.5">
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-all">
                {updateMut.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button onClick={() => setEditItem(null)} className="px-5 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Modal: Bayar (per baris) ════════════════════════════════════════ */}
      {bayarItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 mb-1">Catat Pembayaran</h2>
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-xl mt-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{bayarItem.siswa?.user?.nama}</p>
                  <p className="text-xs text-gray-500">{bayarItem.jenis_biaya} · Sisa {fmtRp(bayarItem.nominal_biaya - bayarItem.nominal_terbayar)}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nominal Bayar (Rp)</label>
                <NominalInput value={bayarForm.nominal_bayar}
                  onChange={v => setBayarForm(f => ({ ...f, nominal_bayar: v }))}
                  hints={[bayarItem.nominal_biaya - bayarItem.nominal_terbayar]} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Metode</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {METODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setBayarForm(f => ({ ...f, bank: value }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all
                        ${bayarForm.bank === value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'}`}>
                      <Icon size={14} className={bayarForm.bank === value ? 'text-emerald-600' : 'text-gray-500'} />
                      <span className={`text-[10px] font-semibold ${bayarForm.bank === value ? 'text-emerald-700' : 'text-gray-500'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">No. Referensi</label>
                <input value={bayarForm.reference_number} onChange={e => setBayarForm(f => ({ ...f, reference_number: e.target.value }))}
                  placeholder="No. transaksi (opsional)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 bg-gray-50/50" />
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2.5">
              <button onClick={() => bayarMut.mutate()} disabled={bayarMut.isPending || !bayarForm.nominal_bayar}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 transition-all shadow-sm shadow-emerald-100">
                {bayarMut.isPending ? 'Mencatat...' : 'Catat Bayar'}
              </button>
              <button onClick={() => setBayarItem(null)} className="px-5 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ Konfirmasi Hapus ════════════════════════════════════════════════ */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">Hapus Tagihan?</h3>
            <p className="text-sm text-gray-400 mb-6">Tagihan dan seluruh riwayat pembayarannya akan dihapus permanen.</p>
            <div className="flex gap-2.5">
              <button onClick={() => deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-all">
                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 font-medium">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
