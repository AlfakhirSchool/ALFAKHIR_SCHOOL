class Child {
  final String id;
  final String nama;
  final String? nisn;
  final String? kelasNama;
  final String? sekolahNama;
  final String? sekolahLevel;
  final String? profilePic;

  const Child({
    required this.id,
    required this.nama,
    this.nisn,
    this.kelasNama,
    this.sekolahNama,
    this.sekolahLevel,
    this.profilePic,
  });

  factory Child.fromJson(Map<String, dynamic> json) => Child(
        id: json['id'] ?? '',
        nama: json['user']?['nama'] ?? json['nama'] ?? '',
        nisn: json['nisn'],
        kelasNama: json['kelas']?['nama'],
        sekolahNama: json['kelas']?['sekolah']?['nama'],
        sekolahLevel: json['kelas']?['sekolah']?['level'],
        profilePic: json['user']?['profile_pic'],
      );

  String get initial => nama.isNotEmpty ? nama[0].toUpperCase() : 'S';
}

class JurnalSummary {
  final String topik;
  final String mapel;
  final DateTime tanggal;
  final String metode;
  final String? catatan;

  const JurnalSummary({
    required this.topik,
    required this.mapel,
    required this.tanggal,
    required this.metode,
    this.catatan,
  });

  factory JurnalSummary.fromJson(Map<String, dynamic> json) => JurnalSummary(
        topik: json['topik_pelajaran'] ?? '',
        mapel: json['mataPelajaran']?['nama'] ?? '',
        tanggal: DateTime.tryParse(json['tanggal'] ?? '') ?? DateTime.now(),
        metode: json['metode_pembelajaran'] ?? '',
        catatan: json['catatan_siswa'],
      );
}
