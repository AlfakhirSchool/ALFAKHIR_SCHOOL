'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function KelasSayaPage() {
  const [selectedKelas, setSelectedKelas] = useState<any>(null);

  const { data: kelasList, isLoading } = useQuery({
    queryKey: ['kelas-guru'],
    queryFn: () => api.get('/kelas').then(r => r.data.data || []),
  });

  const { data: siswaData } = useQuery({
    queryKey: ['siswa-kelas', selectedKelas?.id],
    queryFn: () => api.get(`/kelas/${selectedKelas.id}/siswa`).then(r => r.data.data || []),
    enabled: !!selectedKelas,
  });

  return (
    <div>
      <Header title="Kelas Saya" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {isLoading && <div className="col-span-3 text-center py-8 text-gray-400">Memuat...</div>}
          {(kelasList || []).map((k: any) => (
            <button
              key={k.id}
              onClick={() => setSelectedKelas(selectedKelas?.id === k.id ? null : k)}
              className={`bg-white rounded-xl shadow-sm p-5 text-left transition-all border-2 ${
                selectedKelas?.id === k.id
                  ? 'border-[#1B8B87] shadow-md'
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#1B8B87]/10 rounded-lg flex items-center justify-center text-[#1B8B87] font-bold">
                  {k.tingkat}
                </div>
                <div>
                  <p className="font-semibold text-[#1A2332]">{k.nama}</p>
                  <p className="text-xs text-gray-400">{k.sekolah?.nama}</p>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Wali: {k.waliKelas?.user?.nama || '-'}</span>
                <span>{k.tahun_ajaran}</span>
              </div>
            </button>
          ))}
        </div>

        {selectedKelas && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#1A2332]">
                Siswa Kelas {selectedKelas.nama} ({(siswaData || []).length} siswa)
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">No</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Nama</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">NISN</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">NIS</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(siswaData || []).map((s: any, idx: number) => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-3 font-medium text-gray-800">{s.user?.nama}</td>
                    <td className="px-6 py-3 text-gray-500">{s.nisn || '-'}</td>
                    <td className="px-6 py-3 text-gray-500">{s.nis || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.user?.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {s.user?.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
