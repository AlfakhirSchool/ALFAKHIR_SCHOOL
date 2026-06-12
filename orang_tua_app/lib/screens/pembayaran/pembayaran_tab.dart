import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';
import '../../widgets/child_selector.dart';

class PembayaranTab extends StatelessWidget {
  const PembayaranTab({super.key});

  static final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final list = data.pembayaranList;
    final tunggakan = list.where((p) => !p.isLunas).toList();
    final totalTunggakan = tunggakan.fold(0.0, (s, p) => s + p.sisa);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pembayaran'),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(48), child: ChildSelectorBar()),
      ),
      body: data.loading
          ? const Center(child: CircularProgressIndicator(color: colorPrimary))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Prominent tunggakan banner
                if (tunggakan.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [colorError, colorError.withOpacity(0.8)]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 36),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${tunggakan.length} Tagihan Belum Lunas',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                              Text(_fmt.format(totalTunggakan),
                                  style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                              const Text('Segera bayar sebelum jatuh tempo',
                                  style: TextStyle(color: Colors.white70, fontSize: 11)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                ...list.map((p) {
                  final statusColor = switch (p.status) {
                    'lunas' => colorSuccess, 'sebagian' => colorWarning, _ => p.isOverdue ? colorError : colorError,
                  };
                  final statusLabel = switch (p.status) {
                    'lunas' => 'LUNAS', 'sebagian' => 'SEBAGIAN', _ => p.isOverdue ? 'JATUH TEMPO' : 'BELUM BAYAR',
                  };

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      children: [
                        ListTile(
                          contentPadding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                          title: Text(p.jenisBiaya, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
                          subtitle: Text(p.tahunAjaran, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(color: statusColor.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                            child: Text(statusLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor)),
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
                                  Text(_fmt.format(p.nominalBiaya), style: const TextStyle(fontWeight: FontWeight.w600, color: colorNavy)),
                                ],
                              ),
                              if (!p.isLunas) ...[
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Sisa', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                    Text(_fmt.format(p.sisa), style: TextStyle(fontWeight: FontWeight.bold, color: statusColor)),
                                  ],
                                ),
                              ],
                              if (p.virtualAccount != null && !p.isLunas) ...[
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: colorBg, borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: Colors.grey.shade200),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.account_balance, size: 18, color: Colors.grey),
                                      const SizedBox(width: 8),
                                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                        Text(p.vaBank?.toUpperCase() ?? 'Bank', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                        Text(p.virtualAccount!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 2)),
                                      ]),
                                      const Spacer(),
                                      IconButton(
                                        icon: const Icon(Icons.copy, size: 18, color: Colors.grey),
                                        onPressed: () {
                                          Clipboard.setData(ClipboardData(text: p.virtualAccount!));
                                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Nomor VA disalin'), duration: Duration(seconds: 1)));
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
                }),
              ],
            ),
    );
  }
}
