import 'package:flutter/foundation.dart';
import '../core/api.dart';
import '../models/nilai.dart';
import '../models/absensi.dart';
import '../models/jadwal.dart';
import '../models/pembayaran.dart';
import '../models/child.dart';

class DataProvider extends ChangeNotifier {
  String? _loadedFor;

  List<Nilai> _nilaiList = [];
  AbsensiSummary? _absensiSummary;
  List<AbsensiRecord> _absensiHistory = [];
  List<JadwalPelajaran> _jadwalList = [];
  List<Pembayaran> _pembayaranList = [];
  List<JurnalSummary> _jurnalList = [];
  bool _loading = false;

  List<Nilai> get nilaiList => _nilaiList;
  AbsensiSummary? get absensiSummary => _absensiSummary;
  List<AbsensiRecord> get absensiHistory => _absensiHistory;
  List<JadwalPelajaran> get jadwalList => _jadwalList;
  List<Pembayaran> get pembayaranList => _pembayaranList;
  List<JurnalSummary> get jurnalList => _jurnalList;
  bool get loading => _loading;

  Future<void> loadForChild(Child child) async {
    if (_loadedFor == child.id) return;
    _loadedFor = child.id;
    _loading = true;
    notifyListeners();

    await Future.wait([
      _loadNilai(child.id),
      _loadAbsensi(child.id),
      _loadPembayaran(child.id),
      _loadJurnal(child.id),
    ]);

    _loading = false;
    notifyListeners();
  }

  Future<void> refresh(Child child) async {
    _loadedFor = null;
    await loadForChild(child);
  }

  Future<void> _loadNilai(String siswaId) async {
    try {
      final res = await dio.get('/nilai/$siswaId');
      _nilaiList = (res.data['data'] as List? ?? []).map((e) => Nilai.fromJson(e)).toList();
    } catch (_) {}
  }

  Future<void> _loadAbsensi(String siswaId) async {
    try {
      final res = await dio.get('/absensi/$siswaId/detail');
      final data = res.data['data'] ?? {};
      _absensiSummary = data['summary'] != null ? AbsensiSummary.fromJson(data['summary']) : null;
      _absensiHistory = (data['history'] as List? ?? []).map((e) => AbsensiRecord.fromJson(e)).toList();
    } catch (_) {}
  }

  Future<void> _loadPembayaran(String siswaId) async {
    try {
      final res = await dio.get('/pembayaran', queryParameters: {'siswa_id': siswaId});
      _pembayaranList = (res.data['data'] as List? ?? []).map((e) => Pembayaran.fromJson(e)).toList();
    } catch (_) {}
  }

  Future<void> _loadJurnal(String siswaId) async {
    try {
      final res = await dio.get('/jurnal-guru/laporan/siswa/$siswaId');
      _jurnalList = (res.data['data'] as List? ?? []).map((e) => JurnalSummary.fromJson(e)).toList();
    } catch (_) {}
  }
}
