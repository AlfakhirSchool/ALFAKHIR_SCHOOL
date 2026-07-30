import Link from 'next/link';
import { GraduationCap, ArrowRight } from 'lucide-react';


export default function InterviewerHubPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-10">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter">Pilih Unit Observasi</h1>
        <p className="text-slate-400 font-medium max-w-md mx-auto">
          Pilih unit sekolah untuk melihat daftar kandidat dan mengisi catatan wawancara.
        </p>
        <div className="h-1.5 w-24 bg-teal-500 rounded-full mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
        <Link href="/interviewer/sd"
          className="group relative bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-orange-400 shadow-lg hover:shadow-orange-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-orange-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8 text-orange-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">Unit</span>
            <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight mb-1">SD</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Sekolah Dasar</p>
            <div className="mt-auto flex items-center gap-2 text-orange-500 font-black italic uppercase text-sm">
              Buka <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        <Link href="/interviewer/smp"
          className="group relative bg-white rounded-3xl p-8 border-2 border-slate-100 hover:border-teal-400 shadow-lg hover:shadow-teal-500/10 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-teal-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8 text-teal-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-1">Unit</span>
            <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight mb-1">SMP</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">Sekolah Menengah Pertama</p>
            <div className="mt-auto flex items-center gap-2 text-teal-600 font-black italic uppercase text-sm">
              Buka <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
