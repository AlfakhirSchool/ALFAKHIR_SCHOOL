'use client';

import Link from 'next/link';
import { Bell, ChevronLeft, Megaphone, Calendar } from 'lucide-react';

const DUMMY = [
  {
    id: 1, tag: 'Pengumuman', tagColor: '#F97316', tagBg: '#FFF7ED',
    title: 'Libur Maulid Nabi 1446 H',
    desc: 'Sekolah libur tanggal 5 September 2025. Kegiatan belajar dilanjutkan tanggal 8 September 2025.',
    date: '1 Sep 2025',
  },
  {
    id: 2, tag: 'Kegiatan', tagColor: '#3B82F6', tagBg: '#EFF6FF',
    title: 'Penerimaan Rapor Semester 1',
    desc: 'Jadwal pengambilan rapor siswa oleh wali murid pada 20 Desember 2025 pukul 08.00–12.00 WIB.',
    date: '15 Nov 2025',
  },
  {
    id: 3, tag: 'Info Sekolah', tagColor: '#10B981', tagBg: '#ECFDF5',
    title: 'Program Tahfidz Quran Gelombang 2',
    desc: 'Pendaftaran program tahfidz gelombang 2 dibuka mulai 1 Oktober 2025. Hubungi wali kelas untuk informasi lebih lanjut.',
    date: '25 Sep 2025',
  },
];

export default function PengumumanPage() {
  return (
    <div className="min-h-screen bg-[#F0F2F5]">

      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm px-4 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <ChevronLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="font-black text-gray-900 text-lg leading-none">Pengumuman</h1>
            <p className="text-xs text-gray-400">Berita & informasi sekolah</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-28 space-y-3">
        {DUMMY.map(item => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-1" style={{ background: item.tagColor }} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: item.tagBg, color: item.tagColor }}>
                  {item.tag}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <Calendar size={10} />
                  <span>{item.date}</span>
                </div>
              </div>
              <p className="font-black text-sm text-gray-800 leading-snug mb-1.5">{item.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}

        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <Megaphone size={20} className="text-gray-300" />
          </div>
          <p className="text-xs text-gray-400">Pengumuman terbaru akan muncul di sini</p>
        </div>
      </div>
    </div>
  );
}
