'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

const ROLE_COLOR: Record<string, string> = {
  admin: '#F97316', guru: '#2563EB', siswa: '#16A34A', ortu: '#9333EA',
};
const ROLE_ICON: Record<string, string> = {
  admin: '🛡️', guru: '👨‍🏫', siswa: '👨‍🎓', ortu: '👨‍👧',
};

function timeFormat(d: string) {
  return new Date(d).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogPage() {
  const [filter, setFilter] = useState({
    search: '', role: '', app_source: '',
    start_date: '', end_date: '',
  });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-log', filter, page],
    queryFn: () => api.get('/audit-log', {
      params: {
        page, limit: 40,
        search: filter.search || undefined,
        role: filter.role || undefined,
        app_source: filter.app_source || undefined,
        start_date: filter.start_date || undefined,
        end_date: filter.end_date || undefined,
      },
    }).then(r => r.data),
    refetchInterval: 15000,
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => api.get('/audit-log/stats').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || {};

  const handleFilter = (key: string, val: string) => {
    setFilter(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  return (
    <div>
      <Header title="Audit Log Aktivitas" />
      <div className="p-6 space-y-6">

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" mb-6>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-[#F97316]">
            <p className="text-xs text-gray-500 font-medium uppercase">Total Log</p>
            <p className="text-2xl font-bold text-[#1A2332]">{(stats?.total || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-[#2563EB]">
            <p className="text-xs text-gray-500 font-medium uppercase">Hari Ini</p>
            <p className="text-2xl font-bold text-[#1A2332]">{stats?.today || 0}</p>
          </div>
          {(stats?.byRole || []).slice(0, 2).map((r: any) => (
            <div key={r.role} className="bg-white rounded-xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: ROLE_COLOR[r.role] || '#888' }}>
              <p className="text-xs text-gray-500 font-medium uppercase">{ROLE_ICON[r.role] || '👤'} {r.role}</p>
              <p className="text-2xl font-bold text-[#1A2332]">{r.count}</p>
              <p className="text-xs text-gray-400">aksi hari ini</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <input
            placeholder="🔍 Cari nama / aksi / tabel..."
            value={filter.search}
            onChange={e => handleFilter('search', e.target.value)}
            className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          <select value={filter.role} onChange={e => handleFilter('role', e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
            <option value="">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="guru">Guru</option>
            <option value="siswa">Siswa</option>
            <option value="ortu">Orang Tua</option>
          </select>
          <select value={filter.app_source} onChange={e => handleFilter('app_source', e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]">
            <option value="">Semua Aplikasi</option>
            <option value="Web">Web Dashboard</option>
            <option value="Siswa App">Siswa App</option>
            <option value="Guru App">Guru App</option>
            <option value="Orang Tua App">Orang Tua App</option>
            <option value="Mobile App">Mobile App</option>
          </select>
          <input type="date" value={filter.start_date} onChange={e => handleFilter('start_date', e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          <span className="text-gray-400 text-sm">s/d</span>
          <input type="date" value={filter.end_date} onChange={e => handleFilter('end_date', e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]" />
          {Object.values(filter).some(v => v) && (
            <button onClick={() => { setFilter({ search: '', role: '', app_source: '', start_date: '', end_date: '' }); setPage(1); }}
              className="px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-lg">
              ✕ Reset
            </button>
          )}
          {isFetching && <span className="text-xs text-gray-400 animate-pulse">Memperbarui...</span>}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[600px] w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Waktu</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">User</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Aksi</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Tabel</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">Aplikasi</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase">IP</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Memuat data...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Tidak ada aktivitas ditemukan</td></tr>
              ) : logs.map((log: any) => (
                <>
                  <tr key={log.id} className="hover:bg-gray-50/70 cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {timeFormat(log.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                          style={{ backgroundColor: (ROLE_COLOR[log.role] || '#888') + '20' }}
                        >
                          {ROLE_ICON[log.role] || '👤'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800 text-sm leading-tight">{log.nama || 'Anonim'}</p>
                          <div className="flex gap-1 mt-0.5">
                            {log.role && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium text-white" style={{ backgroundColor: ROLE_COLOR[log.role] || '#888' }}>
                                {log.role}
                              </span>
                            )}
                            {log.school_level && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                                {log.school_level}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-800 font-medium">{log.action}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{log.table_name || '-'}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{log.app_source || 'Web'}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{log.ip_address || '-'}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{expanded === log.id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === log.id && log.new_value && (
                    <tr key={`${log.id}-detail`} className="bg-gray-50">
                      <td colSpan={7} className="px-5 py-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Data yang diinput:</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                          {Object.entries(log.new_value as Record<string, unknown>).map(([k, v]) => (
                            <div key={k} className="flex gap-2 text-xs">
                              <span className="text-gray-400 capitalize min-w-[100px]">{k.replace(/_/g, ' ')}:</span>
                              <span className="text-gray-700 font-medium">{String(v ?? '-')}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {((page - 1) * 40) + 1}–{Math.min(page * 40, pagination.total)} dari {pagination.total?.toLocaleString()} aktivitas
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                <span className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
