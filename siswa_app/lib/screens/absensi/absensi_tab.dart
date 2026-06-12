import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/absensi.dart';

class AbsensiTab extends StatelessWidget {
  const AbsensiTab({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final auth = context.watch<AuthProvider>();
    final summary = data.absensiSummary;
    final history = data.absensiHistory;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Absensi Saya'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (auth.profile != null) data.loadAbsensi(auth.profile!.id);
            },
          ),
        ],
      ),
      body: data.absensiLoading
          ? const Center(child: CircularProgressIndicator(color: colorSMA))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Summary card
                if (summary != null) _SummaryCard(summary: summary),
                const SizedBox(height: 16),

                const Text('Riwayat Absensi',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
                const SizedBox(height: 8),

                if (history.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('Belum ada riwayat absensi', style: TextStyle(color: Colors.grey))),
                    ),
                  )
                else
                  ...history.map((a) => _AbsensiRow(record: a)),
              ],
            ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final AbsensiSummary summary;

  const _SummaryCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    final pct = summary.persentaseHadir;
    final color = pct >= 80 ? colorSuccess : pct >= 70 ? colorWarning : colorError;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Persentase Kehadiran', style: TextStyle(color: Colors.grey, fontSize: 13)),
                    Text('${pct.toStringAsFixed(1)}%',
                        style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: color)),
                  ],
                ),
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Icon(pct >= 80 ? Icons.thumb_up : Icons.warning_amber,
                        color: color, size: 28),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _Chip(label: 'Hadir', count: summary.hadir, color: colorSuccess),
                _Chip(label: 'Sakit', count: summary.sakit, color: colorSMA),
                _Chip(label: 'Izin', count: summary.izin, color: colorWarning),
                _Chip(label: 'Alfa', count: summary.alfa, color: colorError),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _Chip({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text('$count', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }
}

class _AbsensiRow extends StatelessWidget {
  final AbsensiRecord record;

  const _AbsensiRow({required this.record});

  Color get _statusColor => switch (record.status) {
        'hadir' => colorSuccess,
        'sakit' => colorSMA,
        'izin' => colorWarning,
        _ => colorError,
      };

  IconData get _statusIcon => switch (record.status) {
        'hadir' => Icons.check_circle,
        'sakit' => Icons.local_hospital,
        'izin' => Icons.info,
        _ => Icons.cancel,
      };

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: _statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(_statusIcon, color: _statusColor, size: 20),
        ),
        title: Text(
          record.mataPelajaranNama ?? DateFormat('EEEE, d MMM', 'id_ID').format(record.tanggal),
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(
          DateFormat('d MMMM yyyy', 'id_ID').format(record.tanggal),
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: _statusColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            record.status.toUpperCase(),
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _statusColor),
          ),
        ),
      ),
    );
  }
}
