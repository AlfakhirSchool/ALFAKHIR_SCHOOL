'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, School } from 'lucide-react';

const UNITS = [
  {
    href: '/interviewer/sd',
    label: 'SD',
    full: 'Sekolah Dasar',
    desc: 'Wawancara calon siswa jenjang Sekolah Dasar Islam Modern Al-Fakhir',
    gradient: 'from-orange-400 via-orange-500 to-amber-500',
    ring: 'hover:ring-orange-300',
    icon: BookOpen,
    bg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    badge: 'bg-orange-100 text-orange-600',
  },
  {
    href: '/interviewer/smp',
    label: 'SMP',
    full: 'Sekolah Menengah Pertama',
    desc: 'Wawancara calon siswa jenjang Sekolah Menengah Pertama Islam Modern Al-Fakhir',
    gradient: 'from-teal-400 via-teal-500 to-emerald-500',
    ring: 'hover:ring-teal-300',
    icon: School,
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    badge: 'bg-teal-100 text-teal-700',
  },
];

export default function InterviewerHubPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F0F4F8] flex flex-col">
      {/* Header section */}
      <div className="bg-white border-b border-slate-100 px-6 py-8 md:px-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-2">PPDB Al-Fakhir</p>
          <h1 className="text-3xl font-black text-slate-900">Pilih Unit Observasi</h1>
          <p className="text-slate-400 mt-2 text-sm max-w-lg">
            Pilih jenjang untuk melihat daftar kandidat, mengisi catatan wawancara, dan input hasil tes akademik.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {UNITS.map(({ href, label, full, desc, gradient, ring, icon: Icon, bg, iconColor, badge }) => (
            <Link key={href} href={href}
              className={`group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl ring-2 ring-transparent ${ring} transition-all duration-300 hover:-translate-y-1`}>

              {/* Gradient top bar */}
              <div className={`h-2 bg-gradient-to-r ${gradient}`} />

              {/* Decorative circle */}
              <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />

              <div className="p-7 relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={26} className={iconColor} />
                </div>

                <div className="mb-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${badge.split(' ')[1]} ${badge.split(' ')[0]} px-2 py-0.5 rounded-full`}>
                    Unit
                  </span>
                  <h2 className="text-3xl font-black text-slate-900 mt-2 mb-0.5">{label}</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{full}</p>
                </div>

                <p className="text-sm text-slate-500 leading-relaxed mb-6">{desc}</p>

                <div className={`flex items-center gap-2 font-bold text-sm bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                  Buka Daftar Kandidat
                  <ArrowRight size={16} className={`${iconColor} group-hover:translate-x-1 transition-transform`} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick tip */}
        <div className="max-w-3xl mx-auto mt-6">
          <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4 flex gap-3">
            <div className="w-1.5 rounded-full bg-teal-400 flex-shrink-0" />
            <p className="text-sm text-teal-700">
              <span className="font-bold">Tips:</span> Buka detail kandidat untuk mengisi catatan wawancara, 5 field penilaian, dan rekomendasi akhir (Diterima / Pertimbangkan / Tolak).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
