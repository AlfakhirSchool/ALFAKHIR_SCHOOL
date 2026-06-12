import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/nilai.dart';

class NilaiTab extends StatelessWidget {
  const NilaiTab({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final auth = context.watch<AuthProvider>();
    final nilaiList = data.nilaiList;

    Color gradeColor(String? grade) {
      return switch (grade) {
        'A' => colorSuccess,
        'B' => colorSMA,
        'C' => colorWarning,
        'D' => colorAccent,
        _ => colorError,
      };
    }

    double? avgNilai() {
      final valid = nilaiList.where((n) => n.nilaiAkhir != null).toList();
      if (valid.isEmpty) return null;
      return valid.fold(0.0, (sum, n) => sum + n.nilaiAkhir!) / valid.length;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nilai Saya'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              if (auth.profile != null) {
                data.loadNilai(auth.profile!.id);
              }
            },
          ),
        ],
      ),
      body: data.nilaiLoading
          ? const Center(child: CircularProgressIndicator(color: colorSMA))
          : nilaiList.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.bar_chart_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('Belum ada data nilai', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Average card
                    if (avgNilai() != null)
                      Card(
                        color: colorSMA,
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Rata-rata Nilai', style: TextStyle(color: Colors.white70, fontSize: 13)),
                                  Text(avgNilai()!.toStringAsFixed(1),
                                      style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              const Icon(Icons.school, color: Colors.white54, size: 48),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),

                    ...nilaiList.map((n) => _NilaiCard(nilai: n, gradeColor: gradeColor(n.grade))),
                  ],
                ),
    );
  }
}

class _NilaiCard extends StatelessWidget {
  final Nilai nilai;
  final Color gradeColor;

  const _NilaiCard({required this.nilai, required this.gradeColor});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(nilai.mataPelajaranNama,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
                ),
                if (nilai.grade != null)
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: gradeColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(nilai.grade!, style: TextStyle(fontWeight: FontWeight.bold, color: gradeColor, fontSize: 16)),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _ScoreChip(label: 'Kuis', value: nilai.kuis),
                const SizedBox(width: 8),
                _ScoreChip(label: 'Tugas', value: nilai.tugas),
                const SizedBox(width: 8),
                _ScoreChip(label: 'UTS', value: nilai.uts),
                const SizedBox(width: 8),
                _ScoreChip(label: 'UAS', value: nilai.uas),
              ],
            ),
            if (nilai.nilaiAkhir != null) ...[
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Nilai Akhir',
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                  Row(
                    children: [
                      Text(nilai.nilaiAkhir!.toStringAsFixed(1),
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: gradeColor)),
                      if (nilai.kkm != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: nilai.lulus ? colorSuccess.withOpacity(0.1) : colorError.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            nilai.lulus ? 'Lulus' : 'Belum Lulus',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: nilai.lulus ? colorSuccess : colorError,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ScoreChip extends StatelessWidget {
  final String label;
  final double? value;

  const _ScoreChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: colorBg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(value?.toStringAsFixed(0) ?? '-',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: colorNavy)),
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
