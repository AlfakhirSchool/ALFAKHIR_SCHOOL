class Pembayaran {
  final String id;
  final String jenisBiaya;
  final double nominalBiaya;
  final double nominalTerbayar;
  final String status;
  final String? virtualAccount;
  final String? vaBank;
  final DateTime? tanggalJatuhTempo;
  final DateTime? tanggalBayar;
  final String tahunAjaran;

  const Pembayaran({
    required this.id,
    required this.jenisBiaya,
    required this.nominalBiaya,
    required this.nominalTerbayar,
    required this.status,
    required this.tahunAjaran,
    this.virtualAccount,
    this.vaBank,
    this.tanggalJatuhTempo,
    this.tanggalBayar,
  });

  double get sisa => nominalBiaya - nominalTerbayar;
  bool get isLunas => status == 'lunas';
  bool get isOverdue =>
      tanggalJatuhTempo != null &&
      !isLunas &&
      DateTime.now().isAfter(tanggalJatuhTempo!);

  factory Pembayaran.fromJson(Map<String, dynamic> json) => Pembayaran(
        id: json['id'] ?? '',
        jenisBiaya: json['jenis_biaya'] ?? '',
        nominalBiaya: (json['nominal_biaya'] ?? 0).toDouble(),
        nominalTerbayar: (json['nominal_terbayar'] ?? 0).toDouble(),
        status: json['status'] ?? 'belum_bayar',
        tahunAjaran: json['tahun_ajaran'] ?? '',
        virtualAccount: json['virtual_account'],
        vaBank: json['va_bank'],
        tanggalJatuhTempo: json['tanggal_jatuh_tempo'] != null
            ? DateTime.tryParse(json['tanggal_jatuh_tempo'])
            : null,
        tanggalBayar: json['tanggal_bayar'] != null
            ? DateTime.tryParse(json['tanggal_bayar'])
            : null,
      );
}
