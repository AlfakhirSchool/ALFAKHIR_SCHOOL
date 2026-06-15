import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';

class NotifikasiTab extends StatefulWidget {
  const NotifikasiTab({super.key});

  @override
  State<NotifikasiTab> createState() => _NotifikasiTabState();
}

class _NotifikasiTabState extends State<NotifikasiTab> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DataProvider>().loadNotifikasi();
    });
  }

  IconData _iconForType(String? tipe) => switch (tipe) {
    'pembayaran' => Icons.payment,
    'nilai' => Icons.bar_chart,
    'absensi' => Icons.check_circle,
    'pengumuman' => Icons.campaign,
    _ => Icons.notifications,
  };

  Color _colorForType(String? tipe) => switch (tipe) {
    'pembayaran' => colorAccent,
    'nilai' => colorSMA,
    'absensi' => colorSuccess,
    'pengumuman' => colorWarning,
    _ => Colors.grey,
  };

  String _formatTime(String? iso) {
    if (iso == null) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m lalu';
      if (diff.inHours < 24) return '${diff.inHours}j lalu';
      return '${diff.inDays}h lalu';
    } catch (_) { return ''; }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final list = data.notifikasiList;
    final unread = list.where((n) => !(n['is_read'] as bool? ?? false)).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifikasi'),
            if (unread > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: colorAccent, borderRadius: BorderRadius.circular(20)),
                child: Text('$unread', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ],
        ),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: () => data.markAllNotifikasiRead(),
              child: const Text('Semua Dibaca', style: TextStyle(color: Colors.white70, fontSize: 12)),
            ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => data.loadNotifikasi()),
        ],
      ),
      body: data.notifikasiLoading
          ? const Center(child: CircularProgressIndicator(color: colorSD))
          : list.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none_outlined, size: 72, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('Belum ada notifikasi', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
                  itemBuilder: (ctx, i) {
                    final n = list[i];
                    final isRead = n['is_read'] as bool? ?? false;
                    final tipe = n['tipe'] as String?;
                    final color = _colorForType(tipe);

                    return InkWell(
                      onTap: () { if (!isRead) data.markNotifikasiRead(n['id'] as String); },
                      child: Container(
                        color: isRead ? null : colorNavy.withOpacity(0.03),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 44, height: 44,
                              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(22)),
                              child: Icon(_iconForType(tipe), color: color, size: 20),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(n['judul'] ?? 'Notifikasi',
                                            style: TextStyle(
                                              fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
                                              color: colorNavy, fontSize: 14)),
                                      ),
                                      if (!isRead)
                                        Container(width: 8, height: 8,
                                            decoration: const BoxDecoration(color: colorSD, shape: BoxShape.circle)),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(n['pesan'] ?? '',
                                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                                      maxLines: 2, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Text(_formatTime(n['createdAt'] as String?),
                                      style: const TextStyle(color: Colors.grey, fontSize: 11)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
