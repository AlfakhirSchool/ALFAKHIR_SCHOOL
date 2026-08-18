'use client';

import { useState, useRef } from 'react';
import { Key, Upload, CheckCircle, XCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const ALL_JENJANG = ['SD', 'SMP'] as const;

const JENJANG_COLOR: Record<string, { active: string; passive: string }> = {
  SD:  { active: 'bg-orange-500 text-white', passive: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
  SMP: { active: 'bg-[#1B8B87] text-white',  passive: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  SMA: { active: 'bg-blue-600 text-white',    passive: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
};

export default function SiswaPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isMaster = !user?.school_level;
  const JENJANG = user?.school_level ? [user.school_level] : [...ALL_JENJANG];
  const [activeJenjang, setActiveJenjang] = useState(JENJANG[0]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editSiswa, setEditSiswa] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nama: '', nis: '', kelas_id: '', jenis_kelamin: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ nama: '', nis: '', kelas_id: '', jenjang: '', jenis_kelamin: '' });
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<{ nama: string; kelas_nama: string; nis: string; status: string }[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['siswa', search, page, activeJenjang],
    queryFn: () => api.get('/siswa', { params: { search, page, limit: 20, jenjang: activeJenjang } }).then(r => r.data),
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-all'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const siswaList = data?.data || [];
  const pagination = data?.pagination || {};

  const kelasByJenjang = (jenjang: string) =>
    (kelasList as any[]).filter((k: any) => {
      const lvl = k.sekolah?.level || k.sekolah?.jenjang || '';
      return lvl === jenjang || lvl.toUpperCase() === jenjang;
    });

  const openEdit = (s: any) => {
    setEditSiswa(s);
    setEditForm({ nama: s.user?.nama || '', nis: s.nis || '', kelas_id: s.kelas_id || '', jenis_kelamin: s.jenis_kelamin || '' });
  };

  const updateSiswa = useMutation({
    mutationFn: () => api.put(`/siswa/${editSiswa.id}`, editForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['siswa'] }); setEditSiswa(null); },
  });

  const addSiswa = useMutation({
    mutationFn: () => api.post('/siswa', { ...addForm, role: 'siswa' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['siswa'] });
      setShowAdd(false);
      setAddForm({ nama: '', nis: '', kelas_id: '', jenjang: '', jenis_kelamin: '' });
    },
  });

  const toggleAktif = useMutation({
    mutationFn: (s: any) => api.put(`/siswa/${s.id}`, { is_active: !s.user?.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['siswa'] }),
  });

  const parseCsv = (text: string) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      header.forEach((h, i) => { obj[h] = cols[i] || ''; });
      return {
        nama: obj['nama'] || '',
        kelas_nama: obj['kelas'] || '',
        nis: obj['nis'] || '',
        status: obj['status'] || 'AKTIF',
      };
    }).filter(r => r.nama && r.nis);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target?.result as string);
      setImportRows(rows);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const submitImport = async () => {
    if (!importRows.length) return;
    setImportLoading(true);
    try {
      const res = await api.post('/siswa/import-csv', { rows: importRows });
      setImportResult(res.data);
      qc.invalidateQueries({ queryKey: ['siswa'] });
      setImportRows([]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setImportResult({ success: false, message: e?.response?.data?.message || 'Gagal import' });
    } finally { setImportLoading(false); }
  };

  const syncFromSheets = async () => {
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await api.post('/siswa/sync-sheets');
      setImportResult(res.data);
      qc.invalidateQueries({ queryKey: ['siswa'] });
    } catch (e: any) {
      setImportResult({ success: false, message: e?.response?.data?.message || 'Gagal sync' });
    } finally { setImportLoading(false); }
  };

  return (
    <div>
      <Header title="Manajemen Siswa" />
      <div className="p-6">
        {/* Jenjang tabs — hanya tampil untuk master admin */}
        {isMaster && (
          <div className="flex flex-wrap gap-2 mb-4">
            {ALL_JENJANG.map(j => {
              const c = JENJANG_COLOR[j];
              return (
                <button key={j} onClick={() => { setActiveJenjang(j); setPage(1); setSearch(''); }}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeJenjang === j ? c.active : c.passive}`}>
                  {j}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]"
          />
          <button
            onClick={() => { setAddForm({ nama: '', nis: '', kelas_id: '', jenjang: JENJANG.length === 1 ? JENJANG[0] : '', jenis_kelamin: '' }); setShowAdd(true); }}
            className="px-4 py-2.5 bg-[#3B7FD1] text-white rounded-lg hover:bg-[#2d6ab5] transition-colors font-medium"
          >
            + Tambah Siswa
          </button>
          <button
            onClick={() => { setShowImport(true); setImportResult(null); setImportRows([]); }}
            className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Upload size={16} /> Import CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Nama</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">JK</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Kelas</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">NIS (Login)</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Password Default</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Memuat data...</td></tr>
              ) : siswaList.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada data siswa</td></tr>
              ) : siswaList.map((siswa: any) => (
                <tr key={siswa.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#3B7FD1]/10 rounded-full flex items-center justify-center text-[#3B7FD1] font-bold text-sm">
                        {siswa.user?.nama?.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-800">{siswa.user?.nama}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {siswa.jenis_kelamin ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${siswa.jenis_kelamin === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                        {siswa.jenis_kelamin}
                      </span>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                      {siswa.kelas?.nama}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{siswa.nis || <span className="text-gray-400 italic text-xs">Belum ada NIS</span>}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {siswa.user?.password_default || (siswa.nis ? siswa.nis.slice(-4) : '—')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      siswa.user?.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {siswa.user?.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(siswa)} className="text-[#3B7FD1] hover:underline text-xs">Edit</button>
                      <button
                        onClick={() => toggleAktif.mutate(siswa)}
                        disabled={toggleAktif.isPending}
                        className={`text-xs hover:underline ${siswa.user?.is_active ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {siswa.user?.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Menampilkan {siswaList.length} dari {pagination.total} siswa
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Sebelumnya</button>
                <span className="px-3 py-1 bg-[#3B7FD1] text-white rounded text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Siswa */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-[#1A2332]">Tambah Siswa Baru</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                <input value={addForm.nama} onChange={e => setAddForm({ ...addForm, nama: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzi Ramadhan"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
                <p className="text-xs text-gray-400 mt-0.5">Huruf kapital setiap kata — cth: Ahmad Fauzi</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                Login: NIS sebagai username · Password: 4 angka terakhir NIS
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">NIS <span className="text-red-500">*</span></label>
                <input value={addForm.nis} onChange={e => setAddForm({ ...addForm, nis: e.target.value })}
                  placeholder="2024001"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              {JENJANG.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenjang <span className="text-red-500">*</span></label>
                <select
                  value={addForm.jenjang}
                  onChange={e => setAddForm({ ...addForm, jenjang: e.target.value, kelas_id: '' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                >
                  <option value="">-- Pilih Jenjang --</option>
                  {JENJANG.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              )}
              {addForm.jenjang && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kelas <span className="text-red-500">*</span></label>
                  <select
                    value={addForm.kelas_id}
                    onChange={e => setAddForm({ ...addForm, kelas_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">-- Pilih Kelas {addForm.jenjang} --</option>
                    {kelasByJenjang(addForm.jenjang).map((k: any) => (
                      <option key={k.id} value={k.id}>{k.nama}</option>
                    ))}
                  </select>
                  {kelasByJenjang(addForm.jenjang).length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">Belum ada kelas untuk jenjang {addForm.jenjang}</p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                <div className="flex gap-3">
                  {[['L', 'Laki-laki'], ['P', 'Perempuan']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setAddForm({ ...addForm, jenis_kelamin: addForm.jenis_kelamin === val ? '' : val })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${addForm.jenis_kelamin === val ? (val === 'L' ? 'bg-blue-500 text-white border-blue-500' : 'bg-pink-500 text-white border-pink-500') : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {addSiswa.isError && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {(addSiswa.error as any)?.response?.data?.message || 'Gagal menambah siswa'}
                </p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => addSiswa.mutate()}
                disabled={addSiswa.isPending || !addForm.nama || !addForm.nis || !addForm.kelas_id}
                className="flex-1 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50"
              >
                {addSiswa.isPending ? 'Menyimpan...' : 'Tambah Siswa'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import CSV */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-[#1A2332] flex items-center gap-2"><FileSpreadsheet size={18} /> Import Siswa dari CSV</h2>
              <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Sync dari Google Sheets */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800 mb-1 flex items-center gap-2">
                  <FileSpreadsheet size={16} /> Sync dari Google Sheets
                </p>
                <p className="text-xs text-green-700 mb-3">
                  Ambil data langsung dari spreadsheet Data Siswa (tab SD & SMP). Siswa yang sudah ada akan dilewati otomatis.
                </p>
                <button
                  onClick={syncFromSheets}
                  disabled={importLoading}
                  className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importLoading ? <><RefreshCw size={14} className="animate-spin" />Mengambil data...</> : <><RefreshCw size={14} />Sync dari Google Sheets</>}
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="flex-1 h-px bg-gray-200" />
                <span>atau upload file CSV manual</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Format CSV (header baris pertama):</p>
                <p className="font-mono bg-white rounded px-2 py-1 text-xs">NAMA,KELAS,NIS,STATUS</p>
                <p>Kolom STATUS isi: <strong>AKTIF</strong> atau <strong>TIDAK AKTIF</strong> (opsional, default AKTIF)</p>
                <p>Password otomatis = 4 digit terakhir NIS. Nama kelas harus sama persis dengan di sistem.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Pilih file CSV</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFile}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#3B7FD1] file:text-white file:text-sm file:font-medium hover:file:bg-[#2d6ab5] cursor-pointer"
                />
              </div>

              {importRows.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">{importRows.length} baris ditemukan — preview:</p>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600">Nama</th>
                          <th className="px-3 py-2 text-left text-gray-600">Kelas</th>
                          <th className="px-3 py-2 text-left text-gray-600">NIS</th>
                          <th className="px-3 py-2 text-left text-gray-600">PW Default</th>
                          <th className="px-3 py-2 text-left text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {importRows.slice(0, 20).map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2">{r.nama}</td>
                            <td className="px-3 py-2">{r.kelas_nama}</td>
                            <td className="px-3 py-2 font-mono">{r.nis}</td>
                            <td className="px-3 py-2 font-mono text-gray-500">{r.nis?.slice(-4)}</td>
                            <td className="px-3 py-2">{r.status || 'AKTIF'}</td>
                          </tr>
                        ))}
                        {importRows.length > 20 && (
                          <tr><td colSpan={5} className="px-3 py-2 text-gray-400 text-center">...dan {importRows.length - 20} baris lagi</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importResult && (
                <div className={`rounded-lg px-4 py-3 text-sm ${importResult.success ? 'bg-green-50 border border-green-100 text-green-800' : 'bg-red-50 border border-red-100 text-red-800'}`}>
                  <p className="font-semibold mb-2">{importResult.message}</p>
                  {importResult.data && (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {importResult.data.map((r: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {r.status === 'created'
                            ? <CheckCircle size={12} className="text-green-600 flex-shrink-0" />
                            : <XCircle size={12} className="text-red-500 flex-shrink-0" />}
                          <span>{r.nama} ({r.nis})</span>
                          {r.reason && <span className="text-gray-500">— {r.reason}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={submitImport}
                disabled={importLoading || importRows.length === 0}
                className="flex-1 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {importLoading ? 'Mengimpor...' : <><Upload size={14} /> Import {importRows.length > 0 ? `${importRows.length} Siswa` : ''}</>}
              </button>
              <button onClick={() => setShowImport(false)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Siswa */}
      {editSiswa && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-[#1A2332]">Edit Siswa</h2>
              <button onClick={() => setEditSiswa(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                <input value={editForm.nama} onChange={e => setEditForm({ ...editForm, nama: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">NIS</label>
                <input value={editForm.nis} onChange={e => setEditForm({ ...editForm, nis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B7FD1]" />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
                <Key size={14} className="inline mr-1" />Password login: <span className="font-mono font-bold">
                  {editSiswa?.user?.password_default || (editForm.nis ? editForm.nis.slice(-4) : '—')}
                </span> (4 digit terakhir NIS)
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kelas</label>
                <select value={editForm.kelas_id} onChange={e => setEditForm({ ...editForm, kelas_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">-- Pilih Kelas --</option>
                  {(kelasList as any[]).map((k: any) => (
                    <option key={k.id} value={k.id}>{k.sekolah?.level ? `[${k.sekolah.level}] ` : ''}{k.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                <div className="flex gap-3">
                  {[['L', 'Laki-laki'], ['P', 'Perempuan']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setEditForm({ ...editForm, jenis_kelamin: editForm.jenis_kelamin === val ? '' : val })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${editForm.jenis_kelamin === val ? (val === 'L' ? 'bg-blue-500 text-white border-blue-500' : 'bg-pink-500 text-white border-pink-500') : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => updateSiswa.mutate()} disabled={updateSiswa.isPending}
                className="flex-1 py-2.5 bg-[#3B7FD1] text-white rounded-lg text-sm font-medium hover:bg-[#2d6ab5] disabled:opacity-50">
                {updateSiswa.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setEditSiswa(null)} className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
