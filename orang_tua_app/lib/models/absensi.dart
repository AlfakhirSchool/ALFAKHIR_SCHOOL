class AbsensiSummary {
  final int hadir;
  final int sakit;
  final int izin;
  final int alfa;
  final int total;

  const AbsensiSummary({
    required this.hadir,
    required this.sakit,
    required this.izin,
    required this.alfa,
    required this.total,
  });

  double get persentaseHadir => total == 0 ? 0 : (hadir / total * 100);

  factory AbsensiSummary.fromJson(Map<String, dynamic> json) => AbsensiSummary(
        hadir: json['hadir'] ?? 0,
        sakit: json['sakit'] ?? 0,
        izin: json['izin'] ?? 0,
        alfa: json['alfa'] ?? 0,
        total: json['total'] ?? 0,
      );
}

class AbsensiRecord {
  final String id;
  final DateTime tanggal;
  final String? waktuHadir;
  final String status;
  final String? mataPelajaranNama;
  final bool qrCodeScanned;
  final String? catatan;

  const AbsensiRecord({
    required this.id,
    required this.tanggal,
    required this.status,
    this.waktuHadir,
    this.mataPelajaranNama,
    this.qrCodeScanned = false,
    this.catatan,
  });

  factory AbsensiRecord.fromJson(Map<String, dynamic> json) => AbsensiRecord(
        id: json['id'] ?? '',
        tanggal: DateTime.tryParse(json['tanggal'] ?? '') ?? DateTime.now(),
        status: json['status'] ?? 'alfa',
        waktuHadir: json['waktu_hadir'],
        mataPelajaranNama: json['jadwalPelajaran']?['mataPelajaran']?['nama'],
        qrCodeScanned: json['qr_code_scanned'] ?? false,
        catatan: json['catatan'],
      );
}
