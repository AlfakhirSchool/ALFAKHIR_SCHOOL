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

  IconData _iconForType(String? tipe) {
    return switch (tipe) {
      'pembayaran' => Icons.payment,
      'nilai' => Icons.bar_chart,
      'absensi' => Icons.check_circle,
      'jadwal' => Icons.calendar_today,
      'pengumuman' => Icons.campaign,
      _ => Icons.notifications,
    };
  }

  Color _colorForType(String? tipe) {
    return switch (tipe) {
      'pembayaran' => colorAccent,
      'nilai' => colorSMA,
      'absensi' => colorSuccess,
      'jadwal' => colorSMP,
      'pengumuman' => colorWarning,
      _ => Colors.grey,
    };
  }

  String _formatTime(String? isoString) {
    if (isoString == null) return '';
    try {
      final dt = DateTime.parse(isoString).toLocal();
      final now = DateTime.now();
      final diff = now.difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes}m yang lalu';
      if (diff.inHours < 24) return '${diff.inHours}j yang lalu';
      if (diff.inDays < 7) return '${diff.inDays}h yang lalu';
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final notifikasi = data.notifikasiList;
    final unread = notifikasi.where((n) => !(n['is_read'] as bool? ?? false)).length;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const Text('Notifikasi'),
            if (unread > 0) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: colorAccent,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('$unread', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: () => data.markAllNotifikasiRead(),
              child: const Text('Tandai Semua', style: TextStyle(color: Colors.white70, fontSize: 12)),
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => data.loadNotifikasi(),
          ),
        ],
      ),
      body: data.notifikasiLoading
          ? const Center(child: CircularProgressIndicator(color: colorSMA))
          : notifikasi.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none_outlined, size: 72, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('Belum ada notifikasi', style: TextStyle(color: Colors.grey, fontSize: 15)),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: notifikasi.length,
                  separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
                  itemBuilder: (context, i) {
                    final n = notifikasi[i];
                    final isRead = n['is_read'] as bool? ?? false;
                    final tipe = n['tipe'] as String?;
                    final color = _colorForType(tipe);

                    return InkWell(
                      onTap: () {
                        if (!isRead) {
                          data.markNotifikasiRead(n['id'] as String);
                        }
                      },
                      child: Container(
                        color: isRead ? null : colorSMA.withOpacity(0.04),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(22),
                              ),
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
                                              color: colorNavy,
                                              fontSize: 14,
                                            )),
                                      ),
                                      if (!isRead)
                                        Container(
                                          width: 8,
                                          height: 8,
                                          decoration: const BoxDecoration(color: colorSMA, shape: BoxShape.circle),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(n['pesan'] ?? '',
                                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis),
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
