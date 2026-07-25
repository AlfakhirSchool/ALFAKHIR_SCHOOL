'use client';

import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuthStore();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
  const picUrl = user?.profile_pic
    ? user.profile_pic.startsWith('http') ? user.profile_pic : `${apiBase}${user.profile_pic}`
    : null;

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-lg font-semibold text-[#1A2332]">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative text-gray-500 hover:text-gray-700">
          🔔
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">!</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#1B8B87] rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold">
            {picUrl
              ? <img src={picUrl} alt="" className="w-full h-full object-cover" />
              : user?.nama?.charAt(0) || 'G'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-800">{user?.nama}</p>
            <p className="text-xs text-gray-400">Guru</p>
          </div>
        </div>
      </div>
    </header>
  );
}
