import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/school_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../profile/profile_screen.dart';

class HomeTab extends StatelessWidget {
  const HomeTab({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final data = context.watch<DataProvider>();
    final user = auth.user;
    final profile = auth.profile;
    final summary = data.absensiSummary;
    final jadwal = data.jadwalList;

    final school = SchoolTheme.fromLevel(profile?.sekolahLevel);

    final today = DateFormat('EEEE', 'id_ID').format(DateTime.now());
    final jadwalHariIni = jadwal.where((j) => j.hari == today).toList()
      ..sort((a, b) => a.jamMulai.compareTo(b.jamMulai));

    return Scaffold(
      backgroundColor: colorBg,
      body: RefreshIndicator(
        color: school.primary,
        onRefresh: () async {
          if (profile != null) {
            await context.read<DataProvider>().loadDashboard();
            await context.read<DataProvider>().loadAbsensi(profile.id);
          }
        },
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              expandedHeight: 180,
              pinned: true,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: school.gradient,
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Logo sekolah
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 8)],
                            ),
                            padding: const EdgeInsets.all(5),
                            child: Image.asset(school.logoAsset, fit: BoxFit.contain),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(school.namaJenjang,
                                    style: TextStyle(
                                        color: Colors.white.withOpacity(0.85),
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        letterSpacing: 0.3)),
                                const SizedBox(height: 4),
                                Text('Halo, ${user?.nama?.split(' ').first ?? ''} 👋',
                                    style: const TextStyle(
                                        color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 2),
                                Text(profile?.kelasNama ?? '',
                                    style: const TextStyle(color: Colors.white70, fontSize: 13)),
                              ],
                            ),
                          ),
                          // Avatar foto profil
                          GestureDetector(
                            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen())),
                            child: Builder(builder: (context) {
                              final picUrl = profile?.user.profilePic ?? user?.profilePic;
                              String? fullUrl;
                              if (picUrl != null && picUrl.isNotEmpty) {
                                fullUrl = picUrl.startsWith('http')
                                    ? picUrl
                                    : '${baseUrl.replaceAll('/api', '')}$picUrl';
                              }
                              return CircleAvatar(
                                radius: 24,
                                backgroundColor: Colors.white.withOpacity(0.3),
                                backgroundImage: fullUrl != null ? NetworkImage(fullUrl) : null,
                                onBackgroundImageError: fullUrl != null ? (_, __) {} : null,
                                child: fullUrl == null
                                    ? Text(
                                        (user?.nama ?? 'S').substring(0, 1).toUpperCase(),
                                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                                      )
                                    : null,
                              );
                            }),
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
                  _StatCard(
                    label: 'Kehadiran',
                    value: summary != null ? '${summary.persentaseHadir.toStringAsFixed(0)}%' : '-',
                    icon: Icons.check_circle_outline,
                    color: colorSuccess,
                  ),
                  const SizedBox(height: 16),

                  _SectionTitle(title: 'Jadwal Hari Ini · $today', color: school.primary),
                  if (jadwalHariIni.isEmpty)
                    const _EmptyCard(message: 'Tidak ada jadwal hari ini')
                  else
                    ...jadwalHariIni.map((j) => _JadwalCard(jadwal: j, color: school.primary)),
                  const SizedBox(height: 16),

                  _SectionTitle(title: 'Rekap Absensi Bulan Ini', color: school.primary),
                  if (summary != null)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _AbsensiChip(label: 'Hadir', count: summary.hadir, color: colorSuccess),
                            _AbsensiChip(label: 'Sakit', count: summary.sakit, color: school.primary),
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
  final String label, value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
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
    );
  }
}

class _JadwalCard extends StatelessWidget {
  final dynamic jadwal;
  final Color color;

  const _JadwalCard({required this.jadwal, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(jadwal.jamMulai, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
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
  final Color color;

  const _SectionTitle({required this.title, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(width: 4, height: 16, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 8),
          Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: color)),
        ],
      ),
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
