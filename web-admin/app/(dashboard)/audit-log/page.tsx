'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import api from '@/lib/api';

export default function AuditLogPage() {
  const [filter, setFilter] = useState({ table_name: '', action: '', tanggal: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', filter, page],
    queryFn: () => api.get('/audit-log', {
      params: { ...filter, page, limit: 30, table_name: filter.table_name || undefined, action: filter.action || undefined }
    }).then(r => r.data),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || {};

  const actionColors: Record<string, string> = {
    CREATE: 'bg-green-50 text-green-700',
    UPDATE: 'bg-blue-50 text-blue-700',
    DELETE: 'bg-red-50 text-red-700',
    LOGIN: 'bg-purple-50 text-purple-700',
    LOGOUT: 'bg-gray-100 text-gray-600',
  };

  return (
    <div>
      <Header title="Audit Log" />
      <div className="p-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            placeholder="Filter tabel (users, siswa, nilai...)"
            value={filter.table_name}
            onChange={(e) => setFilter({ ...filter, table_name: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1] w-56"
          />
          <select value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]">
            <option value="">Semua Aksi</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
          </select>
          <input type="date" value={filter.tanggal} onChange={(e) => setFilter({ ...filter, tanggal: e.target.value })}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3B7FD1]" />
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Waktu</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">User</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Aksi</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Tabel</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">Record ID</th>
                <th className="text-left px-6 py-4 font-semibold text-gray-700">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Tidak ada log</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-800">{log.user?.nama || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-50 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-600">{log.table_name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{log.record_id?.slice(0, 8)}...</td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Halaman {page} dari {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Prev</button>
                <span className="px-3 py-1 bg-[#3B7FD1] text-white rounded text-sm">{page}</span>
                <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
