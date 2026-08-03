'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BookOpen, ChevronDown, X, Check, Image as ImageIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

type Pilihan = { key: string; text: string };
type Soal = {
  id: string; teks: string; mata_pelajaran: string; pilihan: string;
  jawaban_benar: string; gambar_url: string | null; urutan: number; level: string | null;
};

const LEVELS  = ['SD', 'SMP', 'SMA'];
const MAPELS  = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS', 'Agama', 'PKn'];
const PILIHAN_KEYS = ['A', 'B', 'C', 'D'];

const MAPEL_COLOR: Record<string, string> = {
  'Matematika':       'bg-blue-50 text-blue-700 border-blue-100',
  'Bahasa Indonesia': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Bahasa Inggris':   'bg-purple-50 text-purple-700 border-purple-100',
  'IPA':              'bg-teal-50 text-teal-700 border-teal-100',
  'IPS':              'bg-orange-50 text-orange-700 border-orange-100',
  'Agama':            'bg-yellow-50 text-yellow-700 border-yellow-100',
  'PKn':              'bg-red-50 text-red-700 border-red-100',
};

function parsePilihan(raw: string): Pilihan[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p: any) =>
        typeof p === 'string' ? { key: p[0], text: p.slice(2).trim() } : p
      );
    }
    return PILIHAN_KEYS.map(k => ({ key: k, text: parsed[k] || '' }));
  } catch { return PILIHAN_KEYS.map(k => ({ key: k, text: '' })); }
}

const emptyForm = () => ({
  teks: '', mata_pelajaran: 'Matematika', level: 'SMP', jawaban_benar: 'A',
  gambar_url: '', urutan: 0,
  pilihan: { A: '', B: '', C: '', D: '' } as Record<string, string>,
});

export default function SoalAkademikPage() {
  const qc = useQueryClient();
  const [levelFilter, setLevelFilter] = useState('SMP');
  const [mapelFilter, setMapelFilter] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['soal-admin', levelFilter],
    queryFn: () => api.get('/soal-akademik', { params: { level: levelFilter } }).then(r => r.data.data as Soal[]),
  });

  const soalList = (data || []).filter(s => !mapelFilter || s.mata_pelajaran === mapelFilter);

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/soal-akademik/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soal-admin'] }),
  });

  function openAdd() {
    setForm(emptyForm());
    setEditId(null);
    setModal('add');
  }

  function openEdit(s: Soal) {
    const pl = parsePilihan(s.pilihan);
    const pMap: Record<string, string> = {};
    pl.forEach(p => { pMap[p.key] = p.text; });
    setForm({
      teks: s.teks, mata_pelajaran: s.mata_pelajaran,
      level: s.level || 'SMP', jawaban_benar: s.jawaban_benar,
      gambar_url: s.gambar_url || '', urutan: s.urutan,
      pilihan: { A: pMap['A']||'', B: pMap['B']||'', C: pMap['C']||'', D: pMap['D']||'' },
    });
    setEditId(s.id);
    setModal('edit');
  }

  async function handleSave() {
    if (!form.teks.trim()) return;
    setSaving(true);
    try {
      const payload = {
        teks: form.teks, mata_pelajaran: form.mata_pelajaran,
        level: form.level, jawaban_benar: form.jawaban_benar,
        gambar_url: form.gambar_url || null, urutan: Number(form.urutan),
        pilihan: JSON.stringify(
          PILIHAN_KEYS.map(k => ({ key: k, text: form.pilihan[k] }))
        ),
      };
      if (modal === 'add') {
        await api.post('/soal-akademik', payload);
      } else {
        await api.put(`/soal-akademik/${editId}`, payload);
      }
      qc.invalidateQueries({ queryKey: ['soal-admin'] });
      setModal(null);
    } finally { setSaving(false); }
  }

  const grouped = soalList.reduce<Record<string, Soal[]>>((acc, s) => {
    if (!acc[s.mata_pelajaran]) acc[s.mata_pelajaran] = [];
    acc[s.mata_pelajaran].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Soal Akademik" />
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {LEVELS.map(l => (
              <button key={l} onClick={() => setLevelFilter(l)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  levelFilter === l ? 'bg-teal-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>{l}</button>
            ))}
          </div>
          <select value={mapelFilter} onChange={e => setMapelFilter(e.target.value)}
            className="h-9 px-3 text-sm border border-gray-200 rounded-xl bg-white text-gray-700">
            <option value="">Semua Mapel</option>
            {MAPELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex-1" />
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus size={15} /> Tambah Soal
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MAPELS.filter(m => !mapelFilter || m === mapelFilter).map(m => {
            const count = (data || []).filter(s => s.mata_pelajaran === m && s.level === levelFilter).length;
            if (count === 0 && mapelFilter !== m) return null;
            return (
              <div key={m} className={`bg-white rounded-xl border p-3 cursor-pointer transition-all ${MAPEL_COLOR[m]}`}
                onClick={() => setMapelFilter(mapelFilter === m ? '' : m)}>
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">{m}</p>
                <p className="text-2xl font-black mt-1">{count}</p>
                <p className="text-[10px] opacity-60">soal {levelFilter}</p>
              </div>
            );
          })}
        </div>

        {/* Soal list grouped by mapel */}
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Memuat soal...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Belum ada soal untuk {levelFilter}</p>
          </div>
        ) : Object.entries(grouped).map(([mapel, items]) => (
          <div key={mapel} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`px-5 py-3 border-b flex items-center justify-between ${MAPEL_COLOR[mapel] || 'bg-gray-50 text-gray-700 border-gray-100'}`}>
              <span className="font-bold text-sm">{mapel}</span>
              <span className="text-xs font-semibold opacity-70">{items.length} soal</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((s, idx) => {
                const pil = parsePilihan(s.pilihan);
                return (
                  <div key={s.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium mb-2">{s.teks}</p>
                        {s.gambar_url && (
                          <img src={s.gambar_url} alt="" className="max-h-32 rounded-lg mb-2 border" />
                        )}
                        <div className="grid grid-cols-2 gap-1.5">
                          {pil.map(p => (
                            <div key={p.key} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                              p.key === s.jawaban_benar ? 'bg-green-50 text-green-700 border border-green-200 font-semibold' : 'bg-gray-50 text-gray-600'
                            }`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                                p.key === s.jawaban_benar ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                              }`}>{p.key}</span>
                              {p.text || <span className="opacity-40 italic">kosong</span>}
                              {p.key === s.jawaban_benar && <Check size={11} className="ml-auto" />}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(s)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => { if (confirm(`Hapus soal ini?`)) deleteMut.mutate(s.id); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{modal === 'add' ? 'Tambah Soal' : 'Edit Soal'}</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

              {/* Mapel + Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Mata Pelajaran</label>
                  <select value={form.mata_pelajaran} onChange={e => setForm(f => ({ ...f, mata_pelajaran: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white">
                    {MAPELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Jenjang</label>
                  <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white">
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Teks soal */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Pertanyaan <span className="text-red-400">*</span></label>
                <textarea value={form.teks} onChange={e => setForm(f => ({ ...f, teks: e.target.value }))}
                  rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-teal-400"
                  placeholder="Tulis pertanyaan..." />
              </div>

              {/* Pilihan */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Pilihan Jawaban</label>
                <div className="space-y-2">
                  {PILIHAN_KEYS.map(k => (
                    <div key={k} className="flex items-center gap-2">
                      <button onClick={() => setForm(f => ({ ...f, jawaban_benar: k }))}
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all ${
                          form.jawaban_benar === k ? 'bg-green-500 text-white ring-2 ring-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>{k}</button>
                      <input value={form.pilihan[k]} onChange={e => setForm(f => ({ ...f, pilihan: { ...f.pilihan, [k]: e.target.value } }))}
                        className="flex-1 h-8 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400"
                        placeholder={`Pilihan ${k}`} />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Klik huruf untuk set jawaban benar (hijau)</p>
              </div>

              {/* Gambar URL + urutan */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><ImageIcon size={11} /> URL Gambar (opsional)</label>
                  <input value={form.gambar_url} onChange={e => setForm(f => ({ ...f, gambar_url: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400"
                    placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Urutan</label>
                  <input type="number" value={form.urutan} onChange={e => setForm(f => ({ ...f, urutan: Number(e.target.value) }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSave} disabled={saving || !form.teks.trim()}
                className="flex-1 h-10 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={15} />}
                {modal === 'add' ? 'Simpan Soal' : 'Update Soal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
