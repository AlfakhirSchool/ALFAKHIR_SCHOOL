import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../widgets/child_selector.dart';

class AbsensiTab extends StatelessWidget {
  const AbsensiTab({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final auth = context.watch<AuthProvider>();
    final summary = data.absensiSummary;
    final history = data.absensiHistory;

    return Scaffold(
      appBar: AppBar(title: const Text('Absensi'), bottom: const PreferredSize(preferredSize: Size.fromHeight(48), child: ChildSelectorBar())),
      body: data.loading
          ? const Center(child: CircularProgressIndicator(color: colorPrimary))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (summary != null) ...[
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                const Text('Persentase Kehadiran', style: TextStyle(color: Colors.grey, fontSize: 13)),
                                Text('${summary.persentaseHadir.toStringAsFixed(1)}%',
                                    style: TextStyle(
                                      fontSize: 32, fontWeight: FontWeight.bold,
                                      color: summary.persentaseHadir >= 80 ? colorSuccess : colorError,
                                    )),
                              ]),
                              const SizedBox(width: 12),
                              Text('Total: ${summary.total} pertemuan', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _Chip('Hadir', summary.hadir, colorSuccess),
                              _Chip('Sakit', summary.sakit, const Color(0xFF3B7FD1)),
                              _Chip('Izin', summary.izin, colorWarning),
                              _Chip('Alfa', summary.alfa, colorError),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                const Text('Riwayat', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
                const SizedBox(height: 8),
                if (history.isEmpty)
                  const Card(child: Padding(padding: EdgeInsets.all(24), child: Center(child: Text('Belum ada riwayat', style: TextStyle(color: Colors.grey)))))
                else
                  ...history.map((a) {
                    final statusColor = switch (a.status) {
                      'hadir' => colorSuccess, 'sakit' => const Color(0xFF3B7FD1),
                      'izin' => colorWarning, _ => colorError,
                    };
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: statusColor.withOpacity(0.1),
                          child: Icon(a.status == 'hadir' ? Icons.check : Icons.close, color: statusColor, size: 18),
                        ),
                        title: Text(a.mataPelajaranNama ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        subtitle: Text(DateFormat('d MMMM yyyy', 'id_ID').format(a.tanggal), style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                          child: Text(a.status.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor)),
                        ),
                      ),
                    );
                  }),
              ],
            ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label; final int count; final Color color;
  const _Chip(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text('$count', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
      Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
    ],
  );
}
