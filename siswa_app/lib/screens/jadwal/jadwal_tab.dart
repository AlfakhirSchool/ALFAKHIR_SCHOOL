import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';
import '../../models/jadwal.dart';

const List<String> _days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

class JadwalTab extends StatefulWidget {
  const JadwalTab({super.key});

  @override
  State<JadwalTab> createState() => _JadwalTabState();
}

class _JadwalTabState extends State<JadwalTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    final todayIndex = _todayIndex();
    _tabController = TabController(length: _days.length, vsync: this, initialIndex: todayIndex);
  }

  int _todayIndex() {
    const dayMap = {'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5};
    final dayName = _weekdayName(DateTime.now().weekday);
    return dayMap[dayName] ?? 0;
  }

  String _weekdayName(int weekday) {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][weekday - 1];
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Jadwal Pelajaran'),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: colorAccent,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: _days.map((d) => Tab(text: d.substring(0, 3))).toList(),
        ),
      ),
      body: data.jadwalLoading
          ? const Center(child: CircularProgressIndicator(color: colorSMA))
          : TabBarView(
              controller: _tabController,
              children: _days.map((day) {
                final items = data.jadwalList
                    .where((j) => j.hari == day)
                    .toList()
                  ..sort((a, b) => a.jamMulai.compareTo(b.jamMulai));

                if (items.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.event_busy, size: 64, color: Colors.grey),
                        SizedBox(height: 8),
                        Text('Tidak ada jadwal', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: items.length,
                  itemBuilder: (ctx, i) => _JadwalCard(jadwal: items[i], isFirst: i == 0),
                );
              }).toList(),
            ),
    );
  }
}

class _JadwalCard extends StatelessWidget {
  final JadwalPelajaran jadwal;
  final bool isFirst;

  const _JadwalCard({required this.jadwal, this.isFirst = false});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: IntrinsicHeight(
        child: Row(
          children: [
            Container(
              width: 72,
              decoration: BoxDecoration(
                color: colorSMA.withOpacity(0.1),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(jadwal.jamMulai, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: colorSMA)),
                  const SizedBox(height: 2),
                  const Text('│', style: TextStyle(color: Colors.grey, fontSize: 10)),
                  const SizedBox(height: 2),
                  Text(jadwal.jamSelesai, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(jadwal.mataPelajaranNama,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
                    const SizedBox(height: 4),
                    Text(jadwal.guruNama ?? 'Guru', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ),
            ),
            if (jadwal.ruangan != null)
              Padding(
                padding: const EdgeInsets.only(right: 14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: colorBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Text(jadwal.ruangan!, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
