class JadwalPelajaran {
  final String id;
  final String mataPelajaranNama;
  final String? guruNama;
  final String hari;
  final String jamMulai;
  final String jamSelesai;
  final String? ruangan;

  const JadwalPelajaran({
    required this.id,
    required this.mataPelajaranNama,
    required this.hari,
    required this.jamMulai,
    required this.jamSelesai,
    this.guruNama,
    this.ruangan,
  });

  factory JadwalPelajaran.fromJson(Map<String, dynamic> json) => JadwalPelajaran(
        id: json['id'] ?? '',
        mataPelajaranNama: json['mataPelajaran']?['nama'] ?? '',
        guruNama: json['guru']?['user']?['nama'],
        hari: json['hari'] ?? '',
        jamMulai: json['jam_mulai'] ?? '',
        jamSelesai: json['jam_selesai'] ?? '',
        ruangan: json['ruangan'],
      );
}
