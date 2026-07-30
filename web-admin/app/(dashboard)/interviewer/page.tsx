'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Kandidat = {
  id: string; nama: string; nama_diperbaiki: string | null;
  level: string; status: string; ruangan: string | null;
  pewawancara_nama: string | null; tahun_ajaran: string;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600 border-amber-200',
  REVIEW: 'bg-blue-50 text-blue-600 border-blue-200',
  DITERIMA: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  DITOLAK: 'bg-red-50 text-red-600 border-red-200',
};
const STATUS_LABEL: Record<string, string> = { PENDING: 'Menunggu', REVIEW: 'Wawancara', DITERIMA: 'Diterima', DITOLAK: 'Ditolak' };

const textareaClass = "w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-teal-400 bg-gray-50";

export default function InterviewerPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Kandidat | null>(null);
  const [catatanForm, setCatatanForm] = useState({
    pewawancara_nama: user?.nama || '', pewawancara_email: user?.email || '',
    observasi: '', penilaian_akademik: '', dukungan_keluarga: '',
    catatan_karakter: '', catatan_lain: '', rekomendasi: '',
  });
  const [editingCatatan, setEditingCatatan] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['kandidat-interviewer'],
    queryFn: () => api.get('/kandidat', { params: { limit: 500 } }).then(r => r.data),
  });
  const allKandidat: Kandidat[] = data?.data || [];
  const kandidatList = (user as any)?.role === 'admin'
    ? allKandidat
    : allKandidat.filter(k => k.pewawancara_nama === user?.nama);

  const { data: catatanData } = useQuery({
    queryKey: ['catatan-interviewer', selected?.id],
    queryFn: () => api.get(`/catatan-pewawancara/kandidat/${selected!.id}`).then(r => r.data.data || []),
    enabled: !!selected,
  });
  const catatan: any[] = catatanData || [];

  const createMut = useMutation({
    mutationFn: (d: any) => api.post(`/catatan-pewawancara/kandidat/${selected!.id}`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catatan-interviewer', selected?.id] });
      setCatatanForm(f => ({ ...f, observasi: '', penilaian_akademik: '', dukungan_keluarga: '', catatan_karakter: '', catatan_lain: '', rekomendasi: '' }));
    },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/catatan-pewawancara/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catatan-interviewer', selected?.id] }); setEditingCatatan(null); },
  });

  const fields: [string, string, number][] = [
    ['observasi', 'Observasi Umum', 3],
    ['penilaian_akademik', 'Penilaian Akademik', 2],
    ['dukungan_keluarga', 'Dukungan Keluarga', 2],
    ['catatan_karakter', 'Catatan Karakter', 2],
    ['catatan_lain', 'Catatan Lain', 2],
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Portal Pewawancara" />
      <div className="p-6">
        <div className={`grid gap-6 ${selected ? 'grid-cols-5' : ''}`}>
          <div className={selected ? 'col-span-2' : ''}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-800">Kandidat Saya</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{kandidatList.length} kandidat</p>
                </div>
                <ClipboardList className="text-teal-500" size={20} />
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Memuat...</div>
              ) : kandidatList.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-gray-400 text-sm">Belum ada kandidat ditugaskan.</p>
                  <p className="text-gray-300 text-xs mt-1">Hubungi admin untuk penugasan.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {kandidatList.map(k => {
                    const isSelected = selected?.id === k.id;
                    return (
                      <button key={k.id} onClick={() => setSelected(isSelected ? null : k)}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all ${isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 font-black text-sm">
                            {(k.nama_diperbaiki || k.nama).charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{k.nama_diperbaiki || k.nama}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${STATUS_COLOR[k.status]}`}>{STATUS_LABEL[k.status]}</span>
                              <span className="text-xs text-gray-400">{k.level}</span>
                              {k.ruangan && <span className="text-xs text-gray-400">· R. {k.ruangan}</span>}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={16} className={`text-gray-300 ${isSelected ? 'text-teal-400' : ''}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div className="col-span-3">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-teal-50 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800">{selected.nama_diperbaiki || selected.nama}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {selected.level} · {selected.tahun_ajaran}{selected.ruangan && ` · Ruang ${selected.ruangan}`}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                </div>

                <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-240px)]">
                  {catatan.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Catatan Sebelumnya</h4>
                      <div className="space-y-3">
                        {catatan.map((c: any) => (
                          <div key={c.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-gray-500">{c.pewawancara_nama || 'Anonim'}</span>
                              <div className="flex items-center gap-2">
                                {c.is_locked ? <CheckCircle2 size={14} className="text-teal-500" /> : <Clock size={14} className="text-gray-300" />}
                                {!c.is_locked && (
                                  <button onClick={() => setEditingCatatan({...c})} className="text-xs text-teal-600 hover:underline">Edit</button>
                                )}
                              </div>
                            </div>
                            {c.rekomendasi && (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 ${c.rekomendasi === 'DITERIMA' ? 'bg-emerald-100 text-emerald-700' : c.rekomendasi === 'DITOLAK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                Rekomendasi: {c.rekomendasi}
                              </span>
                            )}
                            {c.observasi && <p className="text-sm text-gray-600 leading-relaxed">{c.observasi}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editingCatatan ? (
                    <div className="border-2 border-teal-200 rounded-xl p-4 bg-teal-50">
                      <h4 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-4">Edit Catatan</h4>
                      <div className="space-y-3">
                        {fields.map(([field, label, rows]) => (
                          <div key={field}>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                            <textarea rows={rows} className={textareaClass}
                              value={editingCatatan[field] || ''}
                              onChange={e => setEditingCatatan((c: any) => ({...c, [field]: e.target.value}))} />
                          </div>
                        ))}
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Rekomendasi</label>
                          <select className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:outline-none focus:border-teal-400"
                            value={editingCatatan.rekomendasi || ''}
                            onChange={e => setEditingCatatan((c: any) => ({...c, rekomendasi: e.target.value}))}>
                            <option value="">Pilih...</option>
                            <option value="DITERIMA">Diterima</option>
                            <option value="REVIEW">Perlu Review</option>
                            <option value="DITOLAK">Ditolak</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateMut.mutate({ id: editingCatatan.id, data: editingCatatan })}
                            disabled={updateMut.isPending}
                            className="flex-1 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
                            {updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
                          </button>
                          <button onClick={() => setEditingCatatan(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
                            Batal
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Tambah Catatan Baru</h4>
                      <div className="space-y-3">
                        {fields.map(([field, label, rows]) => (
                          <div key={field}>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                            <textarea rows={rows} className={textareaClass}
                              value={catatanForm[field as keyof typeof catatanForm] || ''}
                              onChange={e => setCatatanForm(f => ({...f, [field]: e.target.value}))} />
                          </div>
                        ))}
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Rekomendasi</label>
                          <select className="w-full border border-gray-200 rounded-xl p-2.5 text-sm bg-gray-50 focus:outline-none focus:border-teal-400"
                            value={catatanForm.rekomendasi}
                            onChange={e => setCatatanForm(f => ({...f, rekomendasi: e.target.value}))}>
                            <option value="">Pilih...</option>
                            <option value="DITERIMA">Diterima</option>
                            <option value="REVIEW">Perlu Review</option>
                            <option value="DITOLAK">Ditolak</option>
                          </select>
                        </div>
                        <button onClick={() => createMut.mutate(catatanForm)}
                          disabled={createMut.isPending}
                          className="w-full py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 disabled:opacity-50">
                          {createMut.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
