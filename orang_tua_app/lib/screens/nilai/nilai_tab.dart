import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';
import '../../widgets/child_selector.dart';

class NilaiTab extends StatelessWidget {
  const NilaiTab({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final nilaiList = data.nilaiList;

    Color gradeColor(String? g) => switch (g) {
          'A' => colorSuccess, 'B' => colorPrimary,
          'C' => colorWarning, 'D' => colorAccent, _ => colorError,
        };

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nilai Anak'),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(48), child: ChildSelectorBar()),
      ),
      body: data.loading
          ? const Center(child: CircularProgressIndicator(color: colorPrimary))
          : nilaiList.isEmpty
              ? const Center(child: Text('Belum ada data nilai', style: TextStyle(color: Colors.grey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: nilaiList.length,
                  itemBuilder: (ctx, i) {
                    final n = nilaiList[i];
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
                                  child: Text(n.mataPelajaranNama,
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: colorNavy)),
                                ),
                                if (n.grade != null)
                                  Container(
                                    width: 36, height: 36,
                                    decoration: BoxDecoration(
                                      color: gradeColor(n.grade).withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Center(
                                      child: Text(n.grade!,
                                          style: TextStyle(fontWeight: FontWeight.bold, color: gradeColor(n.grade), fontSize: 16)),
                                    ),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                _Score('Kuis', n.kuis), const SizedBox(width: 8),
                                _Score('Tugas', n.tugas), const SizedBox(width: 8),
                                _Score('UTS', n.uts), const SizedBox(width: 8),
                                _Score('UAS', n.uas),
                              ],
                            ),
                            if (n.nilaiAkhir != null) ...[
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Nilai Akhir', style: TextStyle(color: Colors.grey, fontSize: 13)),
                                  Row(
                                    children: [
                                      Text(n.nilaiAkhir!.toStringAsFixed(1),
                                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: gradeColor(n.grade))),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: (n.lulus ? colorSuccess : colorError).withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(n.lulus ? 'Lulus' : 'Belum Lulus',
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                                                color: n.lulus ? colorSuccess : colorError)),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

class _Score extends StatelessWidget {
  final String label;
  final double? value;
  const _Score(this.label, this.value);

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(color: colorBg, borderRadius: BorderRadius.circular(8)),
      child: Column(
        children: [
          Text(value?.toStringAsFixed(0) ?? '-', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: colorNavy)),
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
        ],
      ),
    ),
  );
}
