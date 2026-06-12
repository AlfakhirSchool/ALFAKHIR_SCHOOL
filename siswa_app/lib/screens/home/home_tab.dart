import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';

class HomeTab extends StatelessWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final data = context.watch<DataProvider>();
    final user = auth.user;
    final profile = auth.profile;
    final summary = data.absensiSummary;
    final pembayaran = data.pembayaranList;
    final jadwal = data.jadwalList;

    final today = DateFormat('EEEE', 'id_ID').format(DateTime.now());
    final jadwalHariIni = jadwal.where((j) => j.hari == today).toList()
      ..sort((a, b) => a.jamMulai.compareTo(b.jamMulai));

    final tunggakan = pembayaran.where((p) => !p.isLunas).length;

    return Scaffold(
      backgroundColor: colorBg,
      body: RefreshIndicator(
        color: colorSMA,
        onRefresh: () async {
          if (profile != null) {
            await context.read<DataProvider>().loadDashboard();
            await context.read<DataProvider>().loadAbsensi(profile.id);
            await context.read<DataProvider>().loadPembayaran(profile.id);
          }
        },
        child: CustomScrollView(
          slivers: [
            // App Bar
            SliverAppBar(
              expandedHeight: 160,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [colorNavy, colorSMA],
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Halo, ${user?.nama?.split(' ').first ?? ''} 👋',
                                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                  Text(profile?.kelasNama ?? '', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                ],
                              ),
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: Center(
                                  child: Text(user?.nama?.substring(0, 1) ?? 'S',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Quick Stats
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
                        label: 'Tunggakan',
                        value: '$tunggakan tagihan',
                        icon: Icons.payment_outlined,
                        color: tunggakan > 0 ? colorError : colorSuccess,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Jadwal Hari Ini
                  _SectionTitle(title: 'Jadwal Hari Ini · $today'),
                  if (jadwalHariIni.isEmpty)
                    const _EmptyCard(message: 'Tidak ada jadwal hari ini')
                  else
                    ...jadwalHariIni.map((j) => _JadwalCard(jadwal: j)),
                  const SizedBox(height: 16),

                  // Absensi Summary
                  _SectionTitle(title: 'Rekap Absensi Bulan Ini'),
                  if (summary != null)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _AbsensiChip(label: 'Hadir', count: summary.hadir, color: colorSuccess),
                            _AbsensiChip(label: 'Sakit', count: summary.sakit, color: colorSMA),
                            _AbsensiChip(label: 'Izin', count: summary.izin, color: colorWarning),
                            _AbsensiChip(label: 'Alfa', count: summary.alfa, color: colorError),
                          ],
                        ),
                      ),
                    )
                  else
                    const _EmptyCard(message: 'Data absensi tidak tersedia'),

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
                width: 40,
                height: 40,
                decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
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

class _JadwalCard extends StatelessWidget {
  final dynamic jadwal;

  const _JadwalCard({required this.jadwal});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(color: colorSMA.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(jadwal.jamMulai, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: colorSMA)),
              Text(jadwal.jamSelesai, style: const TextStyle(fontSize: 9, color: Colors.grey)),
            ],
          ),
        ),
        title: Text(jadwal.mataPelajaranNama, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        subtitle: Text('${jadwal.guruNama ?? '-'} · Ruang ${jadwal.ruangan ?? '-'}',
            style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ),
    );
  }
}

class _AbsensiChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _AbsensiChip({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$count', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;

  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: colorNavy)),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String message;

  const _EmptyCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(child: Text(message, style: const TextStyle(color: Colors.grey, fontSize: 13))),
      ),
    );
  }
}
