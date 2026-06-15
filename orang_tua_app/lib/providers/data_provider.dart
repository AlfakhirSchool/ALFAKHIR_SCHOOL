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
  Map<String, dynamic>? _rapor;
  bool _raporLoading = false;
  List<Map<String, dynamic>> _notifikasiList = [];
  bool _notifikasiLoading = false;

  List<Nilai> get nilaiList => _nilaiList;
  AbsensiSummary? get absensiSummary => _absensiSummary;
  List<AbsensiRecord> get absensiHistory => _absensiHistory;
  List<JadwalPelajaran> get jadwalList => _jadwalList;
  List<Pembayaran> get pembayaranList => _pembayaranList;
  List<JurnalSummary> get jurnalList => _jurnalList;
  bool get loading => _loading;
  Map<String, dynamic>? get rapor => _rapor;
  bool get raporLoading => _raporLoading;
  List<Map<String, dynamic>> get notifikasiList => _notifikasiList;
  bool get notifikasiLoading => _notifikasiLoading;
  int get unreadNotifikasi => _notifikasiList.where((n) => !(n['is_read'] as bool? ?? false)).length;

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

  Future<void> loadRapor(String siswaId, {String semester = '1', String tahunAjaran = '2025/2026'}) async {
    _raporLoading = true;
    notifyListeners();
    try {
      final res = await dio.get('/rapor/siswa/$siswaId',
          queryParameters: {'semester': semester, 'tahun_ajaran': tahunAjaran});
      _rapor = res.data['data'] as Map<String, dynamic>?;
    } catch (_) { _rapor = null; }
    _raporLoading = false;
    notifyListeners();
  }

  Future<void> loadNotifikasi() async {
    _notifikasiLoading = true;
    notifyListeners();
    try {
      final res = await dio.get('/notifikasi');
      _notifikasiList = List<Map<String, dynamic>>.from(res.data['data'] as List? ?? []);
    } catch (_) {}
    _notifikasiLoading = false;
    notifyListeners();
  }

  Future<void> markNotifikasiRead(String id) async {
    try {
      await dio.put('/notifikasi/$id/read');
      final idx = _notifikasiList.indexWhere((n) => n['id'] == id);
      if (idx != -1) {
        _notifikasiList[idx] = {..._notifikasiList[idx], 'is_read': true};
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> markAllNotifikasiRead() async {
    try {
      for (final n in _notifikasiList.where((n) => !(n['is_read'] as bool? ?? false))) {
        await dio.put('/notifikasi/${n['id']}/read');
      }
      _notifikasiList = _notifikasiList.map((n) => {...n, 'is_read': true}).toList();
      notifyListeners();
    } catch (_) {}
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
