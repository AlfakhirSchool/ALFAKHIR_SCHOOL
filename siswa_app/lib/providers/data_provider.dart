import 'package:flutter/foundation.dart';
import '../core/api.dart';
import '../models/nilai.dart';
import '../models/absensi.dart';
import '../models/jadwal.dart';
import '../models/pembayaran.dart';

class DataProvider extends ChangeNotifier {
  // Nilai
  List<Nilai> _nilaiList = [];
  bool _nilaiLoading = false;

  // Absensi
  AbsensiSummary? _absensiSummary;
  List<AbsensiRecord> _absensiHistory = [];
  bool _absensiLoading = false;

  // Jadwal
  List<JadwalPelajaran> _jadwalList = [];
  bool _jadwalLoading = false;

  // Pembayaran
  List<Pembayaran> _pembayaranList = [];
  bool _pembayaranLoading = false;

  // Rapor
  Map<String, dynamic>? _rapor;
  bool _raporLoading = false;

  // Notifikasi
  List<Map<String, dynamic>> _notifikasiList = [];
  bool _notifikasiLoading = false;

  // Dashboard summary
  Map<String, dynamic> _dashboardData = {};

  // Getters
  List<Nilai> get nilaiList => _nilaiList;
  bool get nilaiLoading => _nilaiLoading;
  AbsensiSummary? get absensiSummary => _absensiSummary;
  List<AbsensiRecord> get absensiHistory => _absensiHistory;
  bool get absensiLoading => _absensiLoading;
  List<JadwalPelajaran> get jadwalList => _jadwalList;
  bool get jadwalLoading => _jadwalLoading;
  List<Pembayaran> get pembayaranList => _pembayaranList;
  bool get pembayaranLoading => _pembayaranLoading;
  Map<String, dynamic>? get rapor => _rapor;
  bool get raporLoading => _raporLoading;
  List<Map<String, dynamic>> get notifikasiList => _notifikasiList;
  bool get notifikasiLoading => _notifikasiLoading;
  int get unreadNotifikasi => _notifikasiList.where((n) => !(n['is_read'] as bool? ?? false)).length;
  Map<String, dynamic> get dashboardData => _dashboardData;

  Future<void> loadDashboard() async {
    try {
      final res = await dio.get('/dashboard/student');
      _dashboardData = res.data['data'] ?? {};
      notifyListeners();
    } catch (_) {}
  }

  Future<void> loadNilai(String siswaId, {String? semester, String? tahunAjaran}) async {
    _nilaiLoading = true;
    notifyListeners();
    try {
      final res = await dio.get('/nilai/$siswaId', queryParameters: {
        if (semester != null) 'semester': semester,
        if (tahunAjaran != null) 'tahun_ajaran': tahunAjaran,
      });
      _nilaiList = (res.data['data'] as List? ?? [])
          .map((e) => Nilai.fromJson(e))
          .toList();
    } catch (_) {}
    _nilaiLoading = false;
    notifyListeners();
  }

  Future<void> loadAbsensi(String siswaId) async {
    _absensiLoading = true;
    notifyListeners();
    try {
      final res = await dio.get('/absensi/$siswaId/detail');
      final data = res.data['data'] ?? {};
      _absensiSummary = data['summary'] != null
          ? AbsensiSummary.fromJson(data['summary'])
          : null;
      _absensiHistory = (data['history'] as List? ?? [])
          .map((e) => AbsensiRecord.fromJson(e))
          .toList();
    } catch (_) {}
    _absensiLoading = false;
    notifyListeners();
  }

  Future<void> loadJadwal(String kelasId) async {
    _jadwalLoading = true;
    notifyListeners();
    try {
      final res = await dio.get('/kelas/$kelasId/jadwal');
      _jadwalList = (res.data['data'] as List? ?? [])
          .map((e) => JadwalPelajaran.fromJson(e))
          .toList();
    } catch (_) {}
    _jadwalLoading = false;
    notifyListeners();
  }

  Future<void> loadPembayaran(String siswaId) async {
    _pembayaranLoading = true;
    notifyListeners();
    try {
      final res = await dio.get('/pembayaran', queryParameters: {'siswa_id': siswaId});
      _pembayaranList = (res.data['data'] as List? ?? [])
          .map((e) => Pembayaran.fromJson(e))
          .toList();
    } catch (_) {}
    _pembayaranLoading = false;
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

  void clearAll() {
    _nilaiList = [];
    _absensiSummary = null;
    _absensiHistory = [];
    _jadwalList = [];
    _pembayaranList = [];
    _rapor = null;
    _notifikasiList = [];
    _dashboardData = {};
    notifyListeners();
  }
}
