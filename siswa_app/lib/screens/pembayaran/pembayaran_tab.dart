import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/pembayaran.dart';

class PembayaranTab extends StatelessWidget {
  const PembayaranTab({super.key});

  static final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final auth = context.watch<AuthProvider>();
    final list = data.pembayaranList;

    final totalTagihan = list.fold(0.0, (s, p) => s + p.nominalBiaya);
    final totalTerbayar = list.fold(0.0, (s, p) => s + p.nominalTerbayar);
    final totalTunggakan = totalTagihan - totalTerbayar;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pembayaran'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (auth.profile != null) data.loadPembayaran(auth.profile!.id);
            },
          ),
        ],
      ),
      body: data.pembayaranLoading
          ? const Center(child: CircularProgressIndicator(color: colorSMA))
          : list.isEmpty
              ? const Center(child: Text('Tidak ada data pembayaran', style: TextStyle(color: Colors.grey)))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Summary
                    Card(
                      color: colorNavy,
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Total Tunggakan', style: TextStyle(color: Colors.white70, fontSize: 13)),
                            Text(
                              _fmt.format(totalTunggakan),
                              style: TextStyle(
                                color: totalTunggakan > 0 ? colorError : colorSuccess,
                                fontSize: 26,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _SummaryItem(label: 'Total Tagihan', value: _fmt.format(totalTagihan), color: Colors.white70),
                                _SummaryItem(label: 'Sudah Dibayar', value: _fmt.format(totalTerbayar), color: colorSuccess),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text('Daftar Tagihan',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
                    const SizedBox(height: 8),

                    ...list.map((p) => _PembayaranCard(pembayaran: p)),
                  ],
                ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryItem({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: Colors.white54, fontSize: 11)),
        Text(value, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _PembayaranCard extends StatelessWidget {
  final Pembayaran pembayaran;

  static final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  static final _dateFmt = DateFormat('d MMM yyyy', 'id_ID');

  const _PembayaranCard({required this.pembayaran});

  Color get _statusColor => switch (pembayaran.status) {
        'lunas' => colorSuccess,
        'sebagian' => colorWarning,
        _ => pembayaran.isOverdue ? colorError : colorError.withOpacity(0.7),
      };

  String get _statusLabel => switch (pembayaran.status) {
        'lunas' => 'LUNAS',
        'sebagian' => 'SEBAGIAN',
        _ => pembayaran.isOverdue ? 'JATUH TEMPO' : 'BELUM BAYAR',
      };

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            title: Text(pembayaran.jenisBiaya,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
            subtitle: Text(pembayaran.tahunAjaran, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: _statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(_statusLabel,
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: _statusColor)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                    Text(_fmt.format(pembayaran.nominalBiaya),
                        style: const TextStyle(fontWeight: FontWeight.w600, color: colorNavy)),
                  ],
                ),
                if (!pembayaran.isLunas) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Sisa', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      Text(_fmt.format(pembayaran.sisa),
                          style: TextStyle(fontWeight: FontWeight.bold, color: _statusColor)),
                    ],
                  ),
                ],
                if (pembayaran.tanggalJatuhTempo != null) ...[
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Jatuh Tempo', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      Text(
                        _dateFmt.format(pembayaran.tanggalJatuhTempo!),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: pembayaran.isOverdue ? colorError : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
                if (pembayaran.virtualAccount != null && !pembayaran.isLunas) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colorBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance, size: 18, color: Colors.grey),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(pembayaran.vaBank?.toUpperCase() ?? 'Bank',
                                style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            Text(pembayaran.virtualAccount!,
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 2)),
                          ],
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.copy, size: 18, color: Colors.grey),
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: pembayaran.virtualAccount!));
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Nomor VA disalin'), duration: Duration(seconds: 1)),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
