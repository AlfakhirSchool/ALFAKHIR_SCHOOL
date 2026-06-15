import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../widgets/child_selector.dart';

class RaporTab extends StatefulWidget {
  const RaporTab({super.key});

  @override
  State<RaporTab> createState() => _RaporTabState();
}

class _RaporTabState extends State<RaporTab> {
  String _semester = '1';
  String _tahunAjaran = '2025/2026';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  void _load() {
    final auth = context.read<AuthProvider>();
    if (auth.selectedChild != null) {
      context.read<DataProvider>().loadRapor(
        auth.selectedChild!,
        semester: _semester,
        tahunAjaran: _tahunAjaran,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<DataProvider>();
    final auth = context.watch<AuthProvider>();
    final rapor = data.rapor;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rapor Anak'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: Column(
        children: [
          ChildSelector(onChanged: (_) => _load()),

          // Filter semester
          Container(
            color: colorNavy,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _semester,
                    dropdownColor: colorNavy,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Semester',
                      labelStyle: TextStyle(color: Colors.white70, fontSize: 12),
                      border: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                      contentPadding: EdgeInsets.zero,
                    ),
                    items: ['1', '2'].map((s) => DropdownMenuItem(value: s, child: Text('Semester $s'))).toList(),
                    onChanged: (v) { setState(() => _semester = v!); _load(); },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _tahunAjaran,
                    dropdownColor: colorNavy,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Tahun Ajaran',
                      labelStyle: TextStyle(color: Colors.white70, fontSize: 12),
                      border: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                      enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                      contentPadding: EdgeInsets.zero,
                    ),
                    items: ['2025/2026', '2024/2025'].map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                    onChanged: (v) { setState(() => _tahunAjaran = v!); _load(); },
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: auth.selectedChild == null
                ? const Center(child: Text('Pilih anak terlebih dahulu', style: TextStyle(color: Colors.grey)))
                : data.raporLoading
                    ? const Center(child: CircularProgressIndicator(color: colorSD))
                    : rapor == null
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.description_outlined, size: 64, color: Colors.grey),
                                const SizedBox(height: 12),
                                Text('Rapor semester $_semester belum tersedia',
                                    style: const TextStyle(color: Colors.grey)),
                                const SizedBox(height: 8),
                                TextButton(onPressed: _load, child: const Text('Muat Ulang')),
                              ],
                            ),
                          )
                        : ListView(
                            padding: const EdgeInsets.all(16),
                            children: [
                              Card(
                                color: colorNavy,
                                child: Padding(
                                  padding: const EdgeInsets.all(20),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('Rapor Akademik', style: TextStyle(color: Colors.white60, fontSize: 12)),
                                      const SizedBox(height: 4),
                                      Text(rapor['siswa_nama'] ?? '-',
                                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                      Text('${rapor['kelas_nama'] ?? '-'} • $_tahunAjaran Sem $_semester',
                                          style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                      const SizedBox(height: 16),
                                      Row(
                                        children: [
                                          _InfoBox(label: 'Rata-rata', value: (rapor['nilai_rata_rata'] ?? 0).toStringAsFixed(1)),
                                          const SizedBox(width: 8),
                                          _InfoBox(label: 'Ranking', value: '#${rapor['ranking'] ?? '-'}'),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              const Text('Nilai Per Mata Pelajaran',
                                  style: TextStyle(fontWeight: FontWeight.w600, color: colorNavy, fontSize: 15)),
                              const SizedBox(height: 8),
                              ...((rapor['nilai_per_mapel'] as List? ?? []).map((n) => _MapelRow(item: n))),
                            ],
                          ),
          ),
        ],
      ),
    );
  }
}

class _InfoBox extends StatelessWidget {
  final String label;
  final String value;
  const _InfoBox({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.12),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
            Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _MapelRow extends StatelessWidget {
  final Map<String, dynamic> item;
  const _MapelRow({required this.item});

  Color get _gradeColor => switch (item['grade']) {
    'A' => colorSuccess,
    'B' => colorSMA,
    'C' => colorWarning,
    _ => colorError,
  };

  @override
  Widget build(BuildContext context) {
    final nilai = (item['nilai_akhir'] as num?)?.toDouble() ?? 0;
    final kkm = (item['kkm'] as num?)?.toDouble() ?? 75;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: _gradeColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
              child: Center(child: Text(item['grade'] ?? '-',
                  style: TextStyle(fontWeight: FontWeight.bold, color: _gradeColor, fontSize: 16))),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(item['mapel'] ?? item['mata_pelajaran_nama'] ?? '-',
                  style: const TextStyle(fontWeight: FontWeight.w500, color: colorNavy)),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(nilai.toStringAsFixed(1),
                    style: TextStyle(fontWeight: FontWeight.bold, color: _gradeColor, fontSize: 16)),
                Text('KKM: ${kkm.toInt()}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
