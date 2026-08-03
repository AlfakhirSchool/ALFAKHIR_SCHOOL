'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

// ─── Types ───────────────────────────────────────────────────────────────────
type Kandidat = {
  id: string; nama: string; nama_diperbaiki: string | null;
  level: 'SD' | 'SMP' | 'SMA'; status: 'PENDING' | 'REVIEW' | 'DITERIMA' | 'DITOLAK';
  tahun_ajaran: string; nama_ortu: string | null; no_telp_ortu: string | null;
  email_ortu: string | null; email_siswa: string | null; asal_sekolah: string | null;
  jenis_kelamin: string | null; skor_akademik: number | null;
  ruangan: string | null; pewawancara_nama: string | null;
  siswa_id: string | null; created_at: string;
  hasil_tes_akademik?: HasilTes | null;
  ringkasan_ai?: RingkasanAI | null;
};
type CatatanPewawancara = {
  id: string; kandidat_id: string; pewawancara_email: string | null;
  pewawancara_nama: string | null; observasi: string | null;
  penilaian_akademik: string | null; dukungan_keluarga: string | null;
  catatan_karakter: string | null; catatan_lain: string | null;
  rekomendasi: string | null; is_locked: boolean; created_at: string;
};
type HasilTes = { id: string; total_skor: number; skor_per_mapel: string; created_at: string };
type RingkasanAI = { id: string; ringkasan: string; created_at: string };
type SoalAkademik = {
  id: string; teks: string; mata_pelajaran: string; gambar_url: string | null;
  pilihan: string; jawaban_benar: string; urutan: number; level: string | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const LEVEL_COLOR: Record<string, string> = { SD: '#F97316', SMP: '#1B8B87', SMA: '#3B82F6' };
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; border: string }> = {
  PENDING:  { bg: '#FEF3C7', text: '#D97706', label: 'Menunggu',   border: '#FDE68A' },
  REVIEW:   { bg: '#EFF6FF', text: '#2563EB', label: 'Wawancara',  border: '#BFDBFE' },
  DITERIMA: { bg: '#F0FDF4', text: '#16A34A', label: 'Diterima',   border: '#BBF7D0' },
  DITOLAK:  { bg: '#FEF2F2', text: '#DC2626', label: 'Ditolak',    border: '#FECACA' },
};
const REKOM_COLOR: Record<string, string> = {
  DITERIMA: '#16A34A', DITOLAK: '#DC2626', REVIEW: '#D97706', '': '#6B7280',
};

const BLANK_KANDIDAT = {
  nama: '', level: 'SMP', nama_ortu: '', no_telp_ortu: '', email_ortu: '',
  asal_sekolah: '', jenis_kelamin: '', tahun_ajaran: '2025/2026',
};
const BLANK_CATATAN = {
  pewawancara_nama: '', pewawancara_email: '', observasi: '',
  penilaian_akademik: '', dukungan_keluarga: '', catatan_karakter: '',
  catatan_lain: '', rekomendasi: '',
};
const BLANK_SOAL = { teks: '', mata_pelajaran: '', pilihan: '', jawaban_benar: '', urutan: 0, level: '' };

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ObservasiPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const levelFromUser = user?.school_level || '';

  const [tab, setTab] = useState<'kandidat' | 'soal' | 'monitor' | 'pertanyaan'>('kandidat');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel] = useState(levelFromUser);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_KANDIDAT, level: levelFromUser || 'SMP' });
  const [editTarget, setEditTarget] = useState<Kandidat | null>(null);
  const [detail, setDetail] = useState<Kandidat | null>(null);
  const [daftarModal, setDaftarModal] = useState<Kandidat | null>(null);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [daftarResult, setDaftarResult] = useState<{ email: string; password: string } | null>(null);

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ['kandidat', filterStatus, filterLevel],
    queryFn: () => api.get('/kandidat', { params: { status: filterStatus || undefined, level: filterLevel || undefined, limit: 200 } }).then(r => r.data),
  });
  const kandidatList: Kandidat[] = data?.data || [];
  const stats = data?.stats || { total: 0, pending: 0, review: 0, diterima: 0, ditolak: 0 };

  const { data: kelasList } = useQuery({
    queryKey: ['kelas-modal', daftarModal?.level],
    queryFn: () => api.get('/kelas', { params: { jenjang: daftarModal?.level, limit: 100 } }).then(r => r.data.data || []),
    enabled: !!daftarModal,
  });

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/kandidat', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kandidat'] }); setShowForm(false); setForm({ ...BLANK_KANDIDAT, level: levelFromUser || 'SMP' }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/kandidat/${id}`, data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['kandidat'] }); setEditTarget(null); if (detail?.id === res.data.data?.id) setDetail(res.data.data); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/kandidat/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kandidat'] }); if (detail) setDetail(null); },
  });
  const daftarkanMut = useMutation({
    mutationFn: ({ id, kelas_id }: any) => api.post(`/kandidat/${id}/daftarkan`, { kelas_id }),
    onSuccess: (res) => { setDaftarResult(res.data); qc.invalidateQueries({ queryKey: ['kandidat'] }); },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Penerimaan Siswa Baru" />
      <div className="p-6 max-w-7xl mx-auto">

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {([['kandidat', '👤 Kandidat'], ['monitor', '📊 Monitor Pewawancara'], ['soal', '📝 Soal Akademik'], ['pertanyaan', '❓ Pertanyaan Form']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === k ? 'bg-[#1B8B87] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'kandidat' ? (
          <KandidatTab
            kandidatList={kandidatList} stats={stats} isLoading={isLoading}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterLevel={filterLevel} setFilterLevel={setFilterLevel}
            levelFromUser={levelFromUser}
            showForm={showForm} setShowForm={setShowForm}
            form={form} setForm={setForm}
            editTarget={editTarget} setEditTarget={setEditTarget}
            detail={detail} setDetail={setDetail}
            daftarModal={daftarModal} setDaftarModal={setDaftarModal}
            selectedKelas={selectedKelas} setSelectedKelas={setSelectedKelas}
            daftarResult={daftarResult} setDaftarResult={setDaftarResult}
            kelasList={kelasList || []}
            createMut={createMut} updateMut={updateMut} deleteMut={deleteMut} daftarkanMut={daftarkanMut}
            qc={qc}
          />
        ) : tab === 'monitor' ? (
          <MonitorPewawancaraTab levelFromUser={levelFromUser} />
        ) : tab === 'pertanyaan' ? (
          <PertanyaanFormTab />
        ) : (
          <SoalTab levelFromUser={levelFromUser} />
        )}
      </div>
    </div>
  );
}

// ─── Kandidat Tab ─────────────────────────────────────────────────────────────
function KandidatTab({ kandidatList, stats, isLoading, filterStatus, setFilterStatus, filterLevel, setFilterLevel, levelFromUser, showForm, setShowForm, form, setForm, editTarget, setEditTarget, detail, setDetail, daftarModal, setDaftarModal, selectedKelas, setSelectedKelas, daftarResult, setDaftarResult, kelasList, createMut, updateMut, deleteMut, daftarkanMut, qc }: any) {
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: number; fail: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportResult(null);
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    setImportPreview(rows.slice(1, 4).map(r => ({
      nama: r[0], level: r[1], nama_ortu: r[2], no_telp_ortu: r[3], email_ortu: r[4], asal_sekolah: r[5],
    })));
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const XLSX = await import('xlsx');
    const buf = await importFile.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const data = rows.slice(1).filter(r => r[0]);
    let ok = 0, fail = 0;
    for (const r of data) {
      try {
        await import('@/lib/api').then(m => m.default.post('/kandidat', {
          nama: r[0], level: r[1] || 'SMP', nama_ortu: r[2] || '', no_telp_ortu: r[3] || '',
          email_ortu: r[4] || '', asal_sekolah: r[5] || '', tahun_ajaran: r[6] || '2025/2026',
        }));
        ok++;
      } catch { fail++; }
    }
    setImportResult({ ok, fail });
    setImporting(false);
    if (ok > 0) qc.invalidateQueries({ queryKey: ['kandidat'] });
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['nama', 'level', 'nama_ortu', 'no_telp_ortu', 'email_ortu', 'asal_sekolah', 'tahun_ajaran'],
      ['Ahmad Fauzi', 'SMP', 'Bapak Fauzi', '08123456789', 'fauzi@email.com', 'SD Islam Al Fakhir', '2025/2026'],
      ['Siti Aisyah', 'SD', 'Ibu Aisyah', '08987654321', 'aisyah@email.com', 'TK Al Fakhir', '2025/2026'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kandidat');
    XLSX.writeFile(wb, 'template_import_kandidat.xlsx');
  };

  return (
    <div className={detail ? 'grid grid-cols-5 gap-6' : ''}>
      <div className={detail ? 'col-span-2' : ''}>
        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: 'Total', value: stats.total, color: '#6B7280' },
            { label: 'Menunggu', value: stats.pending, color: '#D97706' },
            { label: 'Wawancara', value: stats.review, color: '#2563EB' },
            { label: 'Diterima', value: stats.diterima, color: '#16A34A' },
            { label: 'Ditolak', value: stats.ditolak, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="REVIEW">Wawancara</option>
              <option value="DITERIMA">Diterima</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
            {!levelFromUser && (
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Semua Jenjang</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              const params = new URLSearchParams();
              if (filterStatus) params.set('status', filterStatus);
              if (filterLevel) params.set('level', filterLevel);
              window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/kandidat/export?${params}`, '_blank');
            }} className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
              📥 Export Excel
            </button>
            <button onClick={() => { setShowImport(true); setImportFile(null); setImportPreview([]); setImportResult(null); }}
              className="px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1.5">
              📤 Import Excel
            </button>
            <button onClick={() => { setShowForm(true); setEditTarget(null); setDetail(null); }}
              className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-teal-700">
              + Tambah
            </button>
          </div>
        </div>

        {/* Import modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg">
              <h3 className="font-bold text-gray-800 mb-1">Import Kandidat dari Excel</h3>
              <p className="text-xs text-gray-400 mb-4">Format kolom: nama, level, nama_ortu, no_telp_ortu, email_ortu, asal_sekolah, tahun_ajaran</p>
              <button onClick={downloadTemplate} className="text-xs text-teal-600 underline mb-4 block">Download Template Excel</button>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange}
                className="block w-full text-sm text-gray-600 border border-gray-200 rounded-lg p-2 mb-3" />
              {importPreview.length > 0 && (
                <div className="mb-3 border border-gray-100 rounded-lg overflow-hidden">
                  <p className="text-xs text-gray-400 px-3 py-1 bg-gray-50 border-b">Preview (3 baris pertama)</p>
                  {importPreview.map((r, i) => (
                    <div key={i} className="px-3 py-1.5 text-xs text-gray-600 border-b last:border-0">
                      <span className="font-medium">{r.nama}</span> · {r.level} · {r.nama_ortu}
                    </div>
                  ))}
                </div>
              )}
              {importing && <p className="text-xs text-teal-600 mb-3">Mengimpor data...</p>}
              {importResult && (
                <p className="text-xs mb-3">
                  <span className="text-green-600 font-bold">Berhasil: {importResult.ok}</span>
                  {importResult.fail > 0 && <span className="text-red-500 ml-2">Gagal: {importResult.fail}</span>}
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowImport(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Tutup</button>
                <button onClick={handleImport} disabled={!importFile || importing}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {importing ? 'Mengimpor...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form tambah */}
        {showForm && !editTarget && (
          <div className="bg-white rounded-xl border border-teal-200 p-4 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Tambah Kandidat Baru</h3>
            <KandidatForm form={form} setForm={setForm} levelFromUser={levelFromUser} />
            <div className="flex gap-2 mt-3">
              <button onClick={() => createMut.mutate(form)} disabled={!form.nama || createMut.isPending}
                className="px-4 py-1.5 bg-[#1B8B87] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {createMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* Edit inline */}
        {editTarget && (
          <div className="bg-white rounded-xl border border-amber-300 p-4 mb-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Edit: {editTarget.nama}</h3>
            <KandidatForm form={form} setForm={setForm} levelFromUser={levelFromUser} showStatus />
            <div className="flex gap-2 mt-3">
              <button onClick={() => updateMut.mutate({ id: editTarget.id, data: form })} disabled={updateMut.isPending}
                className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setEditTarget(null)} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">Memuat...</p>
            </div>
          ) : kandidatList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm text-gray-500">Belum ada kandidat</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Nama</th>
                  {!detail && <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Jenjang</th>}
                  {!detail && <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Orang Tua</th>}
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {kandidatList.map((k: Kandidat) => {
                  const st = STATUS_CONFIG[k.status];
                  const isSelected = detail?.id === k.id;
                  return (
                    <tr key={k.id}
                      onClick={() => setDetail(isSelected ? null : k)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-teal-50 border-l-2 border-teal-500' : ''}`}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800 text-xs">{k.nama_diperbaiki || k.nama}</p>
                        {k.nama_diperbaiki && <p className="text-gray-400 text-xs line-through">{k.nama}</p>}
                        {k.skor_akademik != null && (
                          <p className="text-xs text-blue-600 mt-0.5">Skor: {k.skor_akademik}</p>
                        )}
                      </td>
                      {!detail && (
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[k.level] }}>
                            {k.level}
                          </span>
                        </td>
                      )}
                      {!detail && (
                        <td className="px-3 py-2.5 text-gray-500 text-xs">
                          <p>{k.nama_ortu || '—'}</p>
                          {k.no_telp_ortu && <p className="text-gray-400">{k.no_telp_ortu}</p>}
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: st.bg, color: st.text }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => {
                            setEditTarget(k);
                            setForm({ nama: k.nama, level: k.level, nama_ortu: k.nama_ortu || '', no_telp_ortu: k.no_telp_ortu || '', email_ortu: k.email_ortu || '', asal_sekolah: k.asal_sekolah || '', jenis_kelamin: k.jenis_kelamin || '', tahun_ajaran: k.tahun_ajaran, status: k.status, pewawancara_nama: k.pewawancara_nama || '', ruangan: k.ruangan || '' } as any);
                            setShowForm(false);
                          }} className="text-xs text-amber-600 hover:underline">Edit</button>
                          {k.status === 'DITERIMA' && !k.siswa_id && (
                            <button onClick={() => { setDaftarModal(k); setSelectedKelas(''); setDaftarResult(null); }}
                              className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded hover:bg-teal-700">
                              Daftarkan
                            </button>
                          )}
                          {!k.siswa_id && (
                            <button onClick={() => { if (confirm('Hapus kandidat ini?')) deleteMut.mutate(k.id); }}
                              className="text-xs text-red-500 hover:underline">Hapus</button>
                          )}
                          {k.siswa_id && <span className="text-xs text-green-600 font-medium">✓</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="col-span-3">
          <KandidatDetail
            kandidat={detail}
            onClose={() => setDetail(null)}
            onDaftarkan={() => { setDaftarModal(detail); setSelectedKelas(''); setDaftarResult(null); }}
            qc={qc}
          />
        </div>
      )}

      {/* Modal daftarkan */}
      {daftarModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Daftarkan sebagai Siswa</h2>
              <p className="text-sm text-gray-500 mt-0.5">{daftarModal.nama} · {daftarModal.level}</p>
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
                  <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="">— Pilih kelas —</option>
                    {kelasList.map((k: any) => <option key={k.id} value={k.id}>{k.nama} ({k.tahun_ajaran})</option>)}
                  </select>
                  {kelasList.length === 0 && <p className="text-xs text-amber-600 mt-1.5">Belum ada kelas untuk {daftarModal.level}.</p>}
                </>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => { setDaftarModal(null); setDaftarResult(null); }}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                {daftarResult ? 'Tutup' : 'Batal'}
              </button>
              {!daftarResult && (
                <button onClick={() => daftarkanMut.mutate({ id: daftarModal.id, kelas_id: selectedKelas })}
                  disabled={!selectedKelas || daftarkanMut.isPending}
                  className="text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 font-medium">
                  {daftarkanMut.isPending ? 'Memproses...' : 'Daftarkan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Kandidat Detail Panel ────────────────────────────────────────────────────
function KandidatDetail({ kandidat, onClose, onDaftarkan, qc }: { kandidat: Kandidat; onClose: () => void; onDaftarkan: () => void; qc: any }) {
  const [detailTab, setDetailTab] = useState<'info' | 'catatan' | 'tes' | 'ai'>('info');
  const [showQr, setShowQr] = useState(false);

  const { data: catatanData, isLoading: loadCatatan } = useQuery({
    queryKey: ['catatan-pewawancara', kandidat.id],
    queryFn: () => api.get(`/catatan-pewawancara/kandidat/${kandidat.id}`).then(r => r.data.data || []),
  });
  const { data: hasilData } = useQuery({
    queryKey: ['hasil-tes', kandidat.id],
    queryFn: () => api.get(`/soal-akademik/kandidat/${kandidat.id}/hasil`).then(r => r.data.data),
  });
  const { data: ringkasanData } = useQuery({
    queryKey: ['ringkasan-ai', kandidat.id],
    queryFn: () => api.get(`/kandidat/${kandidat.id}`).then(r => r.data.data?.ringkasan_ai || null),
  });

  const catatan: CatatanPewawancara[] = catatanData || [];
  const hasil: HasilTes | null = hasilData || null;
  const ringkasan: RingkasanAI | null = ringkasanData || null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-start justify-between" style={{ backgroundColor: '#f0fdfa' }}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-800">{kandidat.nama_diperbaiki || kandidat.nama}</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: LEVEL_COLOR[kandidat.level] }}>
              {kandidat.level}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: STATUS_CONFIG[kandidat.status].bg, color: STATUS_CONFIG[kandidat.status].text }}>
              {STATUS_CONFIG[kandidat.status].label}
            </span>
          </div>
          {kandidat.nama_diperbaiki && <p className="text-xs text-gray-400 mt-0.5">({kandidat.nama})</p>}
          <p className="text-xs text-gray-500 mt-1">{kandidat.tahun_ajaran} {kandidat.ruangan && `· Ruang: ${kandidat.ruangan}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQr(v => !v)} title="QR Code Tes" className="text-gray-400 hover:text-teal-600 text-sm px-2 py-1 rounded border border-gray-200 hover:border-teal-300">
            QR
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
      </div>

      {/* QR Modal */}
      {showQr && (
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col items-center gap-3">
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/kandidat/${kandidat.id}/qrcode`}
            alt="QR Code" className="w-40 h-40 rounded-xl border border-gray-200 bg-white"
          />
          <p className="text-xs text-gray-500 text-center">Link tes untuk <strong>{kandidat.nama_diperbaiki || kandidat.nama}</strong></p>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/kandidat/${kandidat.id}/qrcode`}
            download={`qr-${kandidat.nama}.png`}
            className="text-xs text-teal-600 hover:underline font-bold">
            ↓ Download QR
          </a>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50 text-xs">
        {([
          ['info', 'Info'],
          ['catatan', `Catatan (${catatan.length})`],
          ['tes', hasil ? `Tes ✓ ${Math.round(hasil.total_skor)}` : 'Tes Akademik'],
          ['ai', ringkasan ? 'Ringkasan AI ✓' : 'Ringkasan AI'],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setDetailTab(k)}
            className={`px-4 py-2.5 font-medium transition-all border-b-2 ${detailTab === k ? 'border-teal-500 text-teal-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 overflow-y-auto max-h-[calc(100vh-280px)]">
        {detailTab === 'info' && <InfoTab kandidat={kandidat} onDaftarkan={onDaftarkan} />}
        {detailTab === 'catatan' && <CatatanTab kandidat={kandidat} catatan={catatan} loading={loadCatatan} qc={qc} />}
        {detailTab === 'tes' && <TesTab kandidat={kandidat} hasil={hasil} />}
        {detailTab === 'ai' && <AITab ringkasan={ringkasan} kandidatId={kandidat.id} qc={qc} />}
      </div>
    </div>
  );
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────
function InfoTab({ kandidat, onDaftarkan }: { kandidat: Kandidat; onDaftarkan: () => void }) {
  const qc = useQueryClient();
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const updateStatus = async (status: string) => {
    if (!confirm(`Yakin set status "${status}" untuk ${kandidat.nama_diperbaiki || kandidat.nama}?\n${kandidat.no_telp_ortu ? 'Notifikasi WA akan dikirim ke ortu.' : 'No HP ortu tidak ada — notif tidak terkirim.'}`)) return;
    setStatusLoading(status);
    setStatusMsg('');
    try {
      await api.patch(`/kandidat/${kandidat.id}/status`, { status });
      qc.invalidateQueries({ queryKey: ['kandidat'] });
      setStatusMsg(kandidat.no_telp_ortu ? '✓ Status diperbarui & notif WA terkirim' : '✓ Status diperbarui (no HP ortu tidak ada)');
    } catch {
      setStatusMsg('✗ Gagal memperbarui status');
    } finally { setStatusLoading(null); }
  };

  const rows = [
    ['Nama Lengkap', kandidat.nama],
    ['Nama (Diperbaiki)', kandidat.nama_diperbaiki || '—'],
    ['Jenjang', kandidat.level],
    ['Status', STATUS_CONFIG[kandidat.status].label],
    ['Tahun Ajaran', kandidat.tahun_ajaran],
    ['Orang Tua', kandidat.nama_ortu || '—'],
    ['No. HP Ortu', kandidat.no_telp_ortu || '—'],
    ['Email Ortu', kandidat.email_ortu || '—'],
    ['Email Siswa', kandidat.email_siswa || '—'],
    ['Asal Sekolah', kandidat.asal_sekolah || '—'],
    ['Jenis Kelamin', kandidat.jenis_kelamin === 'L' ? 'Laki-laki' : kandidat.jenis_kelamin === 'P' ? 'Perempuan' : '—'],
    ['Pewawancara', kandidat.pewawancara_nama || '—'],
    ['Ruangan', kandidat.ruangan || '—'],
    ['Skor Akademik', kandidat.skor_akademik != null ? `${kandidat.skor_akademik}` : '—'],
    ['Terdaftar sbg Siswa', kandidat.siswa_id ? '✓ Ya' : 'Belum'],
  ];
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="col-span-1">
            <dt className="text-xs text-gray-400">{label}</dt>
            <dd className="text-sm font-medium text-gray-700 mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Keputusan */}
      {kandidat.status !== 'DITERIMA' && kandidat.status !== 'DITOLAK' && (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Keputusan Seleksi</p>
          <div className="flex gap-2">
            <button onClick={() => updateStatus('DITERIMA')} disabled={!!statusLoading}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
              {statusLoading === 'DITERIMA' ? '...' : '✓ Terima'}
            </button>
            <button onClick={() => updateStatus('DITOLAK')} disabled={!!statusLoading}
              className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
              {statusLoading === 'DITOLAK' ? '...' : '✗ Tolak'}
            </button>
          </div>
          {statusMsg && <p className={`text-xs text-center ${statusMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>{statusMsg}</p>}
        </div>
      )}

      {kandidat.status === 'DITERIMA' && !kandidat.siswa_id && (
        <button onClick={onDaftarkan}
          className="mt-5 w-full py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          Daftarkan sebagai Siswa
        </button>
      )}
      {kandidat.status === 'DITERIMA' && (
        <button onClick={() => updateStatus('PENDING')}
          className="mt-2 w-full py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:border-gray-400 transition-colors">
          Reset ke Menunggu
        </button>
      )}
      {kandidat.status === 'DITOLAK' && (
        <button onClick={() => updateStatus('PENDING')}
          className="mt-5 w-full py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:border-gray-400 transition-colors">
          Reset ke Menunggu
        </button>
      )}
    </div>
  );
}

// ─── Catatan Pewawancara Tab ───────────────────────────────────────────────────
function CatatanTab({ kandidat, catatan, loading, qc }: { kandidat: Kandidat; catatan: CatatanPewawancara[]; loading: boolean; qc: any }) {
  const [showForm, setShowForm] = useState(false);
  const [editCatatan, setEditCatatan] = useState<CatatanPewawancara | null>(null);
  const [form, setForm] = useState({ ...BLANK_CATATAN });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post(`/catatan-pewawancara/kandidat/${kandidat.id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catatan-pewawancara', kandidat.id] }); setShowForm(false); setForm({ ...BLANK_CATATAN }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/catatan-pewawancara/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catatan-pewawancara', kandidat.id] }); setEditCatatan(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/catatan-pewawancara/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catatan-pewawancara', kandidat.id] }),
  });
  const lockMut = useMutation({
    mutationFn: ({ id, is_locked }: any) => api.put(`/catatan-pewawancara/${id}`, { is_locked }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catatan-pewawancara', kandidat.id] }),
  });

  if (loading) return <div className="py-8 text-center text-xs text-gray-400">Memuat catatan...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-gray-500">{catatan.length} catatan</p>
        <button onClick={() => { setShowForm(!showForm); setEditCatatan(null); }}
          className="text-xs px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
          + Tambah Catatan
        </button>
      </div>

      {(showForm || editCatatan) && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-3">{editCatatan ? 'Edit Catatan' : 'Catatan Baru'}</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Nama Pewawancara', 'pewawancara_nama', 'text'],
              ['Email Pewawancara', 'pewawancara_email', 'text'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500" />
              </div>
            ))}
            {[
              ['Observasi', 'observasi'],
              ['Penilaian Akademik', 'penilaian_akademik'],
              ['Dukungan Keluarga', 'dukungan_keluarga'],
              ['Catatan Karakter', 'catatan_karakter'],
              ['Catatan Lain', 'catatan_lain'],
            ].map(([label, key]) => (
              <div key={key} className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <textarea value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rekomendasi</label>
              <select value={form.rekomendasi} onChange={e => setForm({ ...form, rekomendasi: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-teal-500">
                <option value="">— Pilih —</option>
                <option value="DITERIMA">Diterima</option>
                <option value="REVIEW">Perlu Review</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => {
              if (editCatatan) updateMut.mutate({ id: editCatatan.id, data: form });
              else createMut.mutate(form);
            }} disabled={createMut.isPending || updateMut.isPending}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs disabled:opacity-50">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => { setShowForm(false); setEditCatatan(null); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50">Batal</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {catatan.map((c) => (
          <div key={c.id} className={`border rounded-xl p-3.5 ${c.is_locked ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-800">{c.pewawancara_nama || 'Anonim'}</p>
                {c.pewawancara_email && <p className="text-xs text-gray-400">{c.pewawancara_email}</p>}
              </div>
              <div className="flex items-center gap-2">
                {c.rekomendasi && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ color: REKOM_COLOR[c.rekomendasi] || '#6B7280', backgroundColor: '#f5f5f5' }}>
                    {c.rekomendasi}
                  </span>
                )}
                {c.is_locked && <span className="text-xs text-amber-700">🔒</span>}
                <button onClick={() => lockMut.mutate({ id: c.id, is_locked: !c.is_locked })}
                  className="text-xs text-gray-400 hover:text-gray-600">{c.is_locked ? 'Buka' : 'Kunci'}</button>
                {!c.is_locked && (
                  <>
                    <button onClick={() => {
                      setEditCatatan(c);
                      setForm({ pewawancara_nama: c.pewawancara_nama || '', pewawancara_email: c.pewawancara_email || '', observasi: c.observasi || '', penilaian_akademik: c.penilaian_akademik || '', dukungan_keluarga: c.dukungan_keluarga || '', catatan_karakter: c.catatan_karakter || '', catatan_lain: c.catatan_lain || '', rekomendasi: c.rekomendasi || '' });
                      setShowForm(false);
                    }} className="text-xs text-amber-600 hover:underline">Edit</button>
                    <button onClick={() => { if (confirm('Hapus catatan?')) deleteMut.mutate(c.id); }}
                      className="text-xs text-red-500 hover:underline">Hapus</button>
                  </>
                )}
              </div>
            </div>
            {[
              ['Observasi', c.observasi],
              ['Penilaian Akademik', c.penilaian_akademik],
              ['Dukungan Keluarga', c.dukungan_keluarga],
              ['Catatan Karakter', c.catatan_karakter],
              ['Catatan Lain', c.catatan_lain],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string} className="mt-2">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{value}</p>
              </div>
            ))}
          </div>
        ))}
        {catatan.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">Belum ada catatan pewawancara</div>
        )}
      </div>
    </div>
  );
}

// ─── Tes Akademik Tab ─────────────────────────────────────────────────────────
function TesTab({ kandidat, hasil }: { kandidat: Kandidat; hasil: HasilTes | null }) {
  if (!hasil) {
    return (
      <div className="py-8 text-center">
        <p className="text-3xl mb-2">📝</p>
        <p className="text-sm text-gray-500">Belum mengerjakan tes akademik</p>
        <p className="text-xs text-gray-400 mt-1">Link tes dapat diberikan ke kandidat</p>
      </div>
    );
  }

  let skorMapel: Record<string, { total: number; correct: number }> = {};
  try { skorMapel = JSON.parse(hasil.skor_per_mapel); } catch {}

  const totalSkor = Math.round(hasil.total_skor * 10) / 10;
  const skorColor = totalSkor >= 80 ? '#16A34A' : totalSkor >= 60 ? '#D97706' : '#DC2626';

  return (
    <div>
      <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 mb-4">
        <div className="text-center">
          <p className="text-3xl font-bold" style={{ color: skorColor }}>{totalSkor}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Skor</p>
        </div>
        <div className="h-10 w-px bg-gray-200" />
        <div>
          <p className="text-xs text-gray-500">Dikerjakan</p>
          <p className="text-sm font-medium text-gray-700">{new Date(hasil.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {Object.keys(skorMapel).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Per Mata Pelajaran</p>
          <div className="space-y-2">
            {Object.entries(skorMapel).map(([mapel, data]) => {
              const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              const barColor = pct >= 80 ? '#16A34A' : pct >= 60 ? '#D97706' : '#DC2626';
              return (
                <div key={mapel}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{mapel}</span>
                    <span className="font-medium" style={{ color: barColor }}>{data.correct}/{data.total} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Monitor Pewawancara Tab ──────────────────────────────────────────────────
function MonitorPewawancaraTab({ levelFromUser }: { levelFromUser: string }) {
  const [filterLevel, setFilterLevel] = useState(levelFromUser);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['monitor-pewawancara', filterLevel],
    queryFn: () => api.get('/kandidat/monitor-pewawancara', { params: { level: filterLevel || undefined } }).then(r => r.data.data || []),
  });
  const rows: any[] = data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-700">Progress per Pewawancara</h3>
        <div className="flex items-center gap-2">
          {!levelFromUser && (
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none">
              <option value="">Semua Jenjang</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>
          )}
          <button onClick={() => refetch()} className="text-xs text-teal-600 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Memuat...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Belum ada data.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row: any) => {
            const pct = row.total > 0 ? Math.round(((row.diterima + row.ditolak) / row.total) * 100) : 0;
            const statusBadge = row.status === 'complete'
              ? { label: 'Selesai', cls: 'bg-green-100 text-green-700' }
              : row.status === 'in_progress'
              ? { label: 'Proses', cls: 'bg-yellow-100 text-yellow-700' }
              : { label: 'Belum Mulai', cls: 'bg-gray-100 text-gray-500' };
            return (
              <div key={row.pewawancara_id || 'unassigned'} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm">{row.pewawancara_nama}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{row.sudah_catatan} dari {row.total} sudah dicatat</p>
                  </div>
                  <span className="text-lg font-bold text-teal-600">{row.total}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: 'Menunggu', value: row.pending, color: '#D97706' },
                    { label: 'Wawancara', value: row.review, color: '#2563EB' },
                    { label: 'Diterima', value: row.diterima, color: '#16A34A' },
                    { label: 'Ditolak', value: row.ditolak, color: '#DC2626' },
                  ].map(s => (
                    <div key={s.label} className="text-center p-2 rounded-lg bg-gray-50">
                      <p className="font-bold text-base" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">{pct}% selesai</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Ringkasan AI Tab ─────────────────────────────────────────────────────────
function AITab({ ringkasan, kandidatId, qc }: { ringkasan: RingkasanAI | null; kandidatId: string; qc: any }) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true); setGenError('');
    try {
      await api.post(`/kandidat/${kandidatId}/generate-ai`);
      qc.invalidateQueries({ queryKey: ['ringkasan-ai', kandidatId] });
      qc.invalidateQueries({ queryKey: ['kandidat'] });
    } catch (e: any) {
      setGenError(e.response?.data?.message || 'Gagal generate');
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        {ringkasan
          ? <p className="text-xs text-gray-400">Dibuat: {new Date(ringkasan.created_at).toLocaleDateString('id-ID')}</p>
          : <p className="text-xs text-gray-400">Belum ada ringkasan</p>}
        <button onClick={handleGenerate} disabled={generating}
          className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50">
          {generating ? '⏳ Generating...' : ringkasan ? '🔄 Regenerate AI' : '✨ Generate AI'}
        </button>
      </div>
      {genError && <p className="text-xs text-red-500 mb-2">{genError}</p>}
      {ringkasan ? (
        <div className="bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ringkasan.ringkasan}</p>
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-3xl mb-2">🤖</p>
          <p className="text-sm text-gray-500">Klik Generate AI untuk membuat ringkasan otomatis dari data wawancara.</p>
        </div>
      )}
    </div>
  );
}

// ─── Soal Akademik Tab ────────────────────────────────────────────────────────
function SoalTab({ levelFromUser }: { levelFromUser: string }) {
  const qc = useQueryClient();
  const [filterLevel, setFilterLevel] = useState(levelFromUser);
  const [showForm, setShowForm] = useState(false);
  const [editSoal, setEditSoal] = useState<SoalAkademik | null>(null);
  const [form, setForm] = useState({ ...BLANK_SOAL, level: levelFromUser });

  const { data: soalData, isLoading } = useQuery({
    queryKey: ['soal-akademik', filterLevel],
    queryFn: () => api.get('/soal-akademik', { params: { level: filterLevel || undefined } }).then(r => r.data.data || []),
  });
  const soalList: SoalAkademik[] = soalData || [];

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/soal-akademik', { ...d, pilihan: typeof d.pilihan === 'string' ? d.pilihan : JSON.stringify(d.pilihan) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soal-akademik'] }); setShowForm(false); setForm({ ...BLANK_SOAL, level: levelFromUser }); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/soal-akademik/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['soal-akademik'] }); setEditSoal(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/soal-akademik/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['soal-akademik'] }),
  });

  const mapelGroups = soalList.reduce((acc: Record<string, SoalAkademik[]>, s) => {
    if (!acc[s.mata_pelajaran]) acc[s.mata_pelajaran] = [];
    acc[s.mata_pelajaran].push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
        <div className="flex gap-2">
          {!levelFromUser && (
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Semua Jenjang</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
            </select>
          )}
          <p className="text-sm text-gray-500 self-center">{soalList.length} soal</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditSoal(null); }}
          className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-teal-700">
          + Tambah Soal
        </button>
      </div>

      {(showForm || editSoal) && (
        <div className="bg-white rounded-xl border border-teal-200 p-4 mb-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">{editSoal ? 'Edit Soal' : 'Soal Baru'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Pertanyaan *</label>
              <textarea value={form.teks} onChange={e => setForm({ ...form, teks: e.target.value })} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mata Pelajaran *</label>
              <input value={form.mata_pelajaran} onChange={e => setForm({ ...form, mata_pelajaran: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang</label>
              <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                disabled={!!levelFromUser}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50">
                <option value="">Semua Jenjang</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Pilihan Jawaban (JSON array) *</label>
              <textarea value={form.pilihan} onChange={e => setForm({ ...form, pilihan: e.target.value })} rows={3}
                placeholder={'[{"key":"A","text":"..."},{"key":"B","text":"..."}]'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jawaban Benar *</label>
              <input value={form.jawaban_benar} onChange={e => setForm({ ...form, jawaban_benar: e.target.value })}
                placeholder="A"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Urutan</label>
              <input type="number" value={form.urutan} onChange={e => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => {
              if (editSoal) updateMut.mutate({ id: editSoal.id, data: form });
              else createMut.mutate(form);
            }} disabled={!form.teks || !form.mata_pelajaran || createMut.isPending || updateMut.isPending}
              className="px-4 py-1.5 bg-[#1B8B87] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => { setShowForm(false); setEditSoal(null); }}
              className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">Memuat soal...</div>
      ) : soalList.length === 0 ? (
        <div className="py-12 text-center"><p className="text-3xl mb-2">📝</p><p className="text-sm text-gray-500">Belum ada soal</p></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(mapelGroups).map(([mapel, soals]) => (
            <div key={mapel}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-700">{mapel}</h3>
                <span className="text-xs text-gray-400">({soals.length} soal)</span>
              </div>
              <div className="space-y-2">
                {soals.map((s, idx) => {
                  let pilihan: { key: string; text: string }[] = [];
                  try { pilihan = JSON.parse(s.pilihan); } catch {}
                  return (
                    <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-3.5">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-800 font-medium flex-1 mr-3">
                          <span className="text-gray-400 mr-1.5">{idx + 1}.</span>{s.teks}
                        </p>
                        <div className="flex gap-2 shrink-0">
                          {s.level && (
                            <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: LEVEL_COLOR[s.level] || '#6B7280' }}>
                              {s.level}
                            </span>
                          )}
                          <button onClick={() => {
                            setEditSoal(s);
                            setForm({ teks: s.teks, mata_pelajaran: s.mata_pelajaran, pilihan: s.pilihan, jawaban_benar: s.jawaban_benar, urutan: s.urutan, level: s.level || '' });
                            setShowForm(false);
                          }} className="text-xs text-amber-600 hover:underline">Edit</button>
                          <button onClick={() => { if (confirm('Hapus soal ini?')) deleteMut.mutate(s.id); }}
                            className="text-xs text-red-500 hover:underline">Hapus</button>
                        </div>
                      </div>
                      {pilihan.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {pilihan.map((p) => (
                            <div key={p.key} className={`text-xs px-2 py-1 rounded-lg ${p.key === s.jawaban_benar ? 'bg-green-50 text-green-700 font-medium border border-green-200' : 'bg-gray-50 text-gray-600'}`}>
                              {p.key}. {p.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Kandidat Form ────────────────────────────────────────────────────────────
function KandidatForm({ form, setForm, levelFromUser, showStatus }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap *</label>
        <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang *</label>
        <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
          disabled={!!levelFromUser}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-gray-50">
          <option value="SD">SD</option>
          <option value="SMP">SMP</option>
          <option value="SMA">SMA</option>
        </select>
      </div>
      {showStatus && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
            <option value="PENDING">Menunggu</option>
            <option value="REVIEW">Wawancara</option>
            <option value="DITERIMA">Diterima</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Orang Tua</label>
        <input value={form.nama_ortu} onChange={e => setForm({ ...form, nama_ortu: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">No. HP Orang Tua</label>
        <input value={form.no_telp_ortu} onChange={e => setForm({ ...form, no_telp_ortu: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Email Orang Tua</label>
        <input value={form.email_ortu} onChange={e => setForm({ ...form, email_ortu: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Asal Sekolah</label>
        <input value={form.asal_sekolah} onChange={e => setForm({ ...form, asal_sekolah: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Kelamin</label>
        <select value={form.jenis_kelamin} onChange={e => setForm({ ...form, jenis_kelamin: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500">
          <option value="">— Pilih —</option>
          <option value="L">Laki-laki</option>
          <option value="P">Perempuan</option>
        </select>
      </div>
      {showStatus && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pewawancara</label>
            <input value={form.pewawancara_nama || ''} onChange={e => setForm({ ...form, pewawancara_nama: e.target.value })}
              placeholder="Nama pewawancara yang ditugaskan"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ruangan</label>
            <input value={form.ruangan || ''} onChange={e => setForm({ ...form, ruangan: e.target.value })}
              placeholder="cth: A1"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pertanyaan Form Tab ──────────────────────────────────────────────────────
const TIPE_LABEL: Record<string, string> = { text: 'Teks Singkat', long_text: 'Teks Panjang', choice: 'Pilihan', rating: 'Rating' };
const BLANK_PERTANYAAN = { teks: '', tipe: 'text', role: 'ortu', level: '', urutan: 0, options: '' };

function PertanyaanFormTab() {
  const qc = useQueryClient();
  const [filterRole, setFilterRole] = useState<'ortu' | 'siswa'>('ortu');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ ...BLANK_PERTANYAAN });

  const { data, isLoading } = useQuery({
    queryKey: ['pertanyaan-form', filterRole],
    queryFn: () => api.get('/pertanyaan-form', { params: { role: filterRole } }).then(r => r.data.data || []),
  });
  const list: any[] = data || [];

  const openEdit = (p: any) => {
    setEditTarget(p);
    setForm({ teks: p.teks, tipe: p.tipe, role: p.role, level: p.level || '', urutan: p.urutan, options: p.options || '' });
    setShowForm(true);
  };
  const openAdd = () => { setEditTarget(null); setForm({ ...BLANK_PERTANYAAN, role: filterRole }); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditTarget(null); };

  const saveMut = useMutation({
    mutationFn: (d: any) => editTarget ? api.put(`/pertanyaan-form/${editTarget.id}`, d) : api.post('/pertanyaan-form', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pertanyaan-form'] }); closeForm(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/pertanyaan-form/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pertanyaan-form'] }),
  });

  const handleSave = () => {
    const payload: any = { teks: form.teks, tipe: form.tipe, role: form.role, level: form.level || null, urutan: form.urutan };
    if (form.tipe === 'choice') payload.options = form.options;
    saveMut.mutate(payload);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(['ortu', 'siswa'] as const).map(r => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterRole === r ? 'bg-[#1B8B87] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {r === 'ortu' ? '👨‍👩‍👧 Orang Tua' : '🎒 Siswa'}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="px-4 py-2 bg-[#1B8B87] text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-all">
          + Tambah Pertanyaan
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5 shadow-sm">
          <h4 className="font-semibold text-gray-800 mb-4">{editTarget ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teks Pertanyaan *</label>
              <textarea value={form.teks} onChange={e => setForm({ ...form, teks: e.target.value })} rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
                <select value={form.tipe} onChange={e => setForm({ ...form, tipe: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="text">Teks Singkat</option>
                  <option value="long_text">Teks Panjang</option>
                  <option value="choice">Pilihan</option>
                  <option value="rating">Rating Bintang</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="ortu">Orang Tua</option>
                  <option value="siswa">Siswa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang</label>
                <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Semua Jenjang</option>
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Urutan</label>
                <input type="number" value={form.urutan} onChange={e => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
            {form.tipe === 'choice' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pilihan (JSON array)</label>
                <textarea value={form.options} onChange={e => setForm({ ...form, options: e.target.value })} rows={3}
                  placeholder={'["Pilihan A","Pilihan B","Pilihan C"]'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none font-mono resize-none" />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={!form.teks || saveMut.isPending}
                className="px-4 py-1.5 bg-[#1B8B87] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saveMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={closeForm} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Memuat...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Belum ada pertanyaan.</div>
      ) : (
        <div className="space-y-2">
          {list.map((p: any, idx: number) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-xs font-black text-gray-300 w-6 shrink-0 mt-0.5">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{p.teks}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{TIPE_LABEL[p.tipe] || p.tipe}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{p.role === 'ortu' ? 'Orang Tua' : 'Siswa'}</span>
                    {p.level && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">{p.level}</span>}
                    {p.is_system && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Sistem</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(p)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all" title="Edit">
                  ✏️
                </button>
                <button onClick={() => { if (!p.is_system && confirm('Hapus pertanyaan ini?')) deleteMut.mutate(p.id); }}
                  disabled={p.is_system || deleteMut.isPending}
                  className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title={p.is_system ? 'Pertanyaan sistem tidak bisa dihapus' : 'Hapus'}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
