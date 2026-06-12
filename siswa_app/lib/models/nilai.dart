class Nilai {
  final String id;
  final String mataPelajaranNama;
  final String? mataPelajaranKode;
  final int semester;
  final String tahunAjaran;
  final double? kuis;
  final double? tugas;
  final double? uts;
  final double? uas;
  final double? nilaiAkhir;
  final String? grade;
  final String? predikat;
  final int? kkm;
  final String? catatan;

  const Nilai({
    required this.id,
    required this.mataPelajaranNama,
    required this.semester,
    required this.tahunAjaran,
    this.mataPelajaranKode,
    this.kuis,
    this.tugas,
    this.uts,
    this.uas,
    this.nilaiAkhir,
    this.grade,
    this.predikat,
    this.kkm,
    this.catatan,
  });

  bool get lulus => nilaiAkhir != null && kkm != null && nilaiAkhir! >= kkm!;

  factory Nilai.fromJson(Map<String, dynamic> json) => Nilai(
        id: json['id'] ?? '',
        mataPelajaranNama: json['mataPelajaran']?['nama'] ?? json['mata_pelajaran_nama'] ?? '',
        mataPelajaranKode: json['mataPelajaran']?['kode'],
        semester: json['semester'] ?? 1,
        tahunAjaran: json['tahun_ajaran'] ?? '',
        kuis: json['kuis']?.toDouble(),
        tugas: json['tugas']?.toDouble(),
        uts: json['uts']?.toDouble(),
        uas: json['uas']?.toDouble(),
        nilaiAkhir: json['nilai_akhir']?.toDouble(),
        grade: json['grade'],
        predikat: json['predikat'],
        kkm: json['mataPelajaran']?['kkm'],
        catatan: json['catatan'],
      );
}
