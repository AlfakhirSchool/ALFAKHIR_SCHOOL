import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../providers/data_provider.dart';
import '../../widgets/child_selector.dart';

class LearningTab extends StatelessWidget {
  const LearningTab({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final jurnalList = data.jurnalList;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Topik Pembelajaran'),
        bottom: const PreferredSize(preferredSize: Size.fromHeight(48), child: ChildSelectorBar()),
      ),
      body: data.loading
          ? const Center(child: CircularProgressIndicator(color: colorPrimary))
          : jurnalList.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.menu_book_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 12),
                      Text('Belum ada data pembelajaran', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: jurnalList.length,
                  itemBuilder: (ctx, i) {
                    final j = jurnalList[i];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  width: 44, height: 44,
                                  decoration: BoxDecoration(
                                    color: colorPrimary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.menu_book, color: colorPrimary, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(j.topik,
                                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: colorNavy)),
                                      const SizedBox(height: 2),
                                      Text(j.mapel, style: const TextStyle(color: colorPrimary, fontSize: 12, fontWeight: FontWeight.w500)),
                                    ],
                                  ),
                                ),
                                Text(
                                  DateFormat('d MMM', 'id_ID').format(j.tanggal),
                                  style: const TextStyle(color: Colors.grey, fontSize: 11),
                                ),
                              ],
                            ),
                            if (j.metode.isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: colorBg,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.lightbulb_outline, size: 14, color: colorWarning),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text('Metode: ${j.metode}',
                                          style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            if (j.catatan != null && j.catatan!.isNotEmpty) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: colorAccent.withOpacity(0.05),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: colorAccent.withOpacity(0.2)),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.comment_outlined, size: 14, color: colorAccent),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(j.catatan!,
                                          style: const TextStyle(fontSize: 12, color: colorNavy)),
                                    ),
                                  ],
                                ),
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
