import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../widgets/child_selector.dart';

class HomeTab extends StatelessWidget {
  const HomeTab({super.key});

  static final _fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final data = context.watch<DataProvider>();
    final child = auth.selectedChild;
    final summary = data.absensiSummary;
    final pembayaran = data.pembayaranList;
    final nilaiList = data.nilaiList;

    final tunggakan = pembayaran.where((p) => !p.isLunas).toList();
    final totalTunggakan = tunggakan.fold(0.0, (s, p) => s + p.sisa);
    final avgNilai = nilaiList.isEmpty ? null
        : nilaiList.fold(0.0, (s, n) => s + (n.nilaiAkhir ?? 0)) / nilaiList.length;

    return Scaffold(
      backgroundColor: colorBg,
      body: RefreshIndicator(
        color: colorPrimary,
        onRefresh: () async {
          if (child != null) await data.refresh(child);
        },
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                collapseMode: CollapseMode.pin,
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [colorNavy, colorPrimary],
                    ),
                  ),
                  child: SafeArea(
                    child: Column(
                      children: [
                        const ChildSelectorBar(),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(20),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Container(
                                  width: 52, height: 52,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.2),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(child?.initial ?? 'S',
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 22)),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(child?.nama ?? 'Anak', style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                                      Text(child?.kelasNama ?? '', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                      if (child?.sekolahNama != null)
                                        Text(child!.sekolahNama!, style: const TextStyle(color: Colors.white54, fontSize: 11)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Tunggakan banner (if any)
                  if (tunggakan.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colorError.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: colorError.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded, color: colorError, size: 28),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Ada Tunggakan Pembayaran!',
                                    style: TextStyle(fontWeight: FontWeight.bold, color: colorError)),
                                Text(_fmt.format(totalTunggakan),
                                    style: const TextStyle(fontSize: 13, color: colorError)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Quick stats
                  Row(
                    children: [
                      _StatCard(
                        label: 'Kehadiran',
                        value: summary != null ? '${summary.persentaseHadir.toStringAsFixed(0)}%' : '-',
                        icon: Icons.check_circle_outline,
                        color: colorSuccess,
                      ),
                      const SizedBox(width: 12),
                      _StatCard(
                        label: 'Rata-rata Nilai',
                        value: avgNilai != null ? avgNilai.toStringAsFixed(1) : '-',
                        icon: Icons.school_outlined,
                        color: colorPrimary,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Absensi summary
                  if (summary != null) ...[
                    const _SectionTitle('Absensi Bulan Ini'),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _AbsensiChip('Hadir', summary.hadir, colorSuccess),
                            _AbsensiChip('Sakit', summary.sakit, const Color(0xFF3B7FD1)),
                            _AbsensiChip('Izin', summary.izin, colorWarning),
                            _AbsensiChip('Alfa', summary.alfa, colorError),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Recent nilai
                  if (nilaiList.isNotEmpty) ...[
                    const _SectionTitle('Nilai Terbaru'),
                    ...nilaiList.take(3).map((n) => Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(n.mataPelajaranNama, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                        trailing: n.nilaiAkhir != null
                            ? Text(n.nilaiAkhir!.toStringAsFixed(0),
                                style: TextStyle(
                                  fontSize: 20, fontWeight: FontWeight.bold,
                                  color: n.nilaiAkhir! >= 75 ? colorSuccess : colorError,
                                ))
                            : null,
                      ),
                    )),
                  ],

                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AbsensiChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _AbsensiChip(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: colorNavy)),
    );
  }
}
