'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [namaForm, setNamaForm] = useState({ new_nama: '' });
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');
  const [namaMsg, setNamaMsg] = useState('');
  const [photoMsg, setPhotoMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropState, setCropState] = useState<{ img: HTMLImageElement; url: string } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const CANVAS_SIZE = 300;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  const profilePicUrl = user?.profile_pic
    ? user.profile_pic.startsWith('http')
      ? user.profile_pic
      : `${apiBase}${user.profile_pic}`
    : null;

  const { data: pendingData, refetch: refetchPending } = useQuery({
    queryKey: ['my-pending'],
    queryFn: () => api.get('/pending-changes/mine').then(r => r.data.data || []),
  });
  const pending: any[] = pendingData || [];

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.post('/auth/upload-photo', fd, { headers: { 'Content-Type': undefined } });
    },
    onSuccess: (res) => {
      const pic = res.data?.data?.profile_pic;
      if (pic) updateUser({ profile_pic: pic });
      setPhotoMsg('Foto profil berhasil diperbarui');
      setTimeout(() => setPhotoMsg(''), 3000);
    },
    onError: () => {
      setPhotoMsg('Gagal mengupload foto. Pastikan ukuran file < 5MB');
      setTimeout(() => setPhotoMsg(''), 4000);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { setCropState({ img, url }); setZoom(1); setOffset({ x: 0, y: 0 }); };
    img.src = url;
  };

  const cropAndUpload = useCallback(() => {
    if (!cropState) return;
    const { img } = cropState;
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const scale = Math.min(img.width, img.height) / CANVAS_SIZE;
    const drawSize = CANVAS_SIZE * zoom;
    const sx = ((img.width - drawSize * scale) / 2) - offset.x * scale;
    const sy = ((img.height - drawSize * scale) / 2) - offset.y * scale;
    ctx.drawImage(img, sx, sy, drawSize * scale, drawSize * scale, 0, 0, 400, 400);
    URL.revokeObjectURL(cropState.url);
    setCropState(null);
    canvas.toBlob(blob => {
      if (blob) uploadPhoto.mutate(new File([blob], 'profile.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  }, [cropState, zoom, offset, uploadPhoto]);

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: dragStart.current.ox + (e.clientX - dragStart.current.mx), y: dragStart.current.oy + (e.clientY - dragStart.current.my) });
  };
  const onMouseUp = () => setDragging(false);

  const requestPassword = useMutation({
    mutationFn: () => api.post('/pending-changes/request', {
      type: 'password',
      new_value: pwForm.new_password,
      current_password: pwForm.current_password,
    }),
    onSuccess: (r: any) => {
      setMsg(r.data.message);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      refetchPending();
    },
    onError: (e: any) => setMsg(e.response?.data?.message || 'Gagal mengirim permintaan'),
  });

  const requestNama = useMutation({
    mutationFn: () => api.post('/pending-changes/request', {
      type: 'nama',
      new_value: namaForm.new_nama,
    }),
    onSuccess: (r: any) => {
      setNamaMsg(r.data.message);
      setNamaForm({ new_nama: '' });
      refetchPending();
    },
    onError: (e: any) => setNamaMsg(e.response?.data?.message || 'Gagal mengirim permintaan'),
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setMsg('Konfirmasi password tidak cocok');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setMsg('Password baru minimal 6 karakter');
      return;
    }
    requestPassword.mutate();
  };

  const handleNamaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaForm.new_nama.trim()) {
      setNamaMsg('Nama baru wajib diisi');
      return;
    }
    requestNama.mutate();
  };

  const statusIcon = (s: string) => {
    if (s === 'pending') return <Clock size={14} className="text-yellow-500" />;
    if (s === 'approved') return <CheckCircle size={14} className="text-green-500" />;
    return <XCircle size={14} className="text-red-500" />;
  };

  const statusLabel = (s: string) => s === 'pending' ? 'Menunggu' : s === 'approved' ? 'Disetujui' : 'Ditolak';

  return (
    <div>
      <Header title="Pengaturan" />

      {/* Crop Modal */}
      {cropState && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-[#1A2332] mb-4 text-center">Atur Posisi Foto</h3>
            <div className="relative mx-auto overflow-hidden rounded-full border-4 border-[#1B8B87] cursor-move select-none"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
              <img src={cropState.url} alt="" draggable={false}
                style={{
                  position: 'absolute',
                  width: CANVAS_SIZE * zoom,
                  height: CANVAS_SIZE * zoom,
                  left: '50%', top: '50%',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }} />
            </div>
            <div className="mt-4">
              <label className="text-xs text-gray-500 block mb-1">Zoom</label>
              <input type="range" min="1" max="3" step="0.05" value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#1B8B87]" />
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">Drag foto untuk mengatur posisi</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { URL.revokeObjectURL(cropState.url); setCropState(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Batal</button>
              <button onClick={cropAndUpload} disabled={uploadPhoto.isPending}
                className="flex-1 px-4 py-2.5 bg-[#1B8B87] text-white rounded-xl text-sm font-bold hover:bg-[#156f6c] disabled:opacity-50">
                {uploadPhoto.isPending ? 'Mengupload...' : 'Simpan Foto'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="p-6 max-w-2xl space-y-6">

        {/* Profil */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Profil Saya</h2>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full overflow-hidden cursor-pointer bg-gradient-to-br from-[#1B8B87] to-[#0d6b68] flex items-center justify-center text-white text-3xl font-bold ring-4 ring-[#1B8B87] ring-offset-4 ring-offset-white shadow-lg hover:ring-offset-2 transition-all duration-200"
              >
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Foto profil" className="w-full h-full object-cover" />
                ) : (
                  user?.nama?.charAt(0)
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadPhoto.isPending}
                className="absolute bottom-1 right-1 bg-[#1B8B87] rounded-full p-1.5 border-2 border-white text-white hover:bg-[#156f6c] shadow-md transition-colors"
              >
                {uploadPhoto.isPending ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div>
              <p className="font-semibold text-[#1A2332] text-lg">{user?.nama}</p>
              <p className="text-gray-500 text-sm">{(user?.email || '').replace(/@[^@]+$/, '')}</p>
              <span className="text-xs bg-[#1B8B87]/10 text-[#1B8B87] px-2 py-0.5 rounded-full mt-1 inline-block capitalize">{user?.role}</span>
              {photoMsg && (
                <p className={`text-xs mt-2 ${photoMsg.includes('berhasil') ? 'text-green-600' : 'text-red-500'}`}>{photoMsg}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Klik foto untuk mengubah foto profil (maks 5MB)</p>
        </div>

        {/* Info approval */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Ubah Nama & Password memerlukan persetujuan Admin Master</p>
          <p className="text-xs text-amber-700">Permintaan akan dikirim ke Admin Master (Feri) untuk disetujui terlebih dahulu sebelum perubahan diterapkan.</p>
        </div>

        {/* Ubah Nama */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Ubah Nama</h2>
          {namaMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${namaMsg.includes('berhasil') || namaMsg.includes('dikirim') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {namaMsg}
            </div>
          )}
          <form onSubmit={handleNamaSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Baru</label>
              <input type="text" value={namaForm.new_nama}
                onChange={e => setNamaForm({ new_nama: e.target.value })}
                placeholder={user?.nama || 'Nama baru'}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]" />
            </div>
            <button type="submit" disabled={requestNama.isPending}
              className="px-6 py-2.5 bg-[#1B8B87] text-white rounded-lg font-medium hover:bg-[#156f6c] disabled:opacity-50">
              {requestNama.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
            </button>
          </form>
        </div>

        {/* Ubah Password */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-[#1A2332] mb-4">Ubah Password</h2>
          {msg && (
            <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.includes('berhasil') || msg.includes('dikirim') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {msg}
            </div>
          )}
          <form onSubmit={handlePwSubmit} className="space-y-4">
            {([
              { label: 'Password Saat Ini', key: 'current_password', ph: '••••••••' },
              { label: 'Password Baru', key: 'new_password', ph: 'Min. 6 karakter' },
              { label: 'Konfirmasi Password Baru', key: 'confirm', ph: '••••••••' },
            ] as const).map(({ label, key, ph }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="relative">
                  <input type={showPw[key] ? 'text' : 'password'} value={pwForm[key]}
                    onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B8B87]"
                    placeholder={ph} />
                  <button type="button" onClick={() => setShowPw(v => ({ ...v, [key]: !v[key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" disabled={requestPassword.isPending}
              className="px-6 py-2.5 bg-[#1B8B87] text-white rounded-lg font-medium hover:bg-[#156f6c] disabled:opacity-50">
              {requestPassword.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
            </button>
          </form>
        </div>

        {/* Riwayat permintaan */}
        {pending.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-[#1A2332] mb-4">Riwayat Permintaan</h2>
            <div className="space-y-2">
              {pending.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    {statusIcon(p.status)}
                    <span className="font-medium capitalize">{p.type === 'password' ? 'Ubah Password' : 'Ubah Nama'}</span>
                    {p.type === 'nama' && <span className="text-gray-500">→ {p.new_value}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {p.catatan && <span className="text-xs text-gray-500 italic">{p.catatan}</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      p.status === 'approved' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>{statusLabel(p.status)}</span>
                    <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
