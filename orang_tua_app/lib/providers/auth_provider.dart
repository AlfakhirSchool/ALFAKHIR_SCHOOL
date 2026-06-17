import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../core/api.dart';
import '../core/storage.dart';
import '../models/child.dart';

class OrangTuaUser {
  final String id;
  final String email;
  final String nama;
  final String role;

  const OrangTuaUser({required this.id, required this.email, required this.nama, required this.role});

  factory OrangTuaUser.fromJson(Map<String, dynamic> json) => OrangTuaUser(
        id: json['id'] ?? '', email: json['email'] ?? '',
        nama: json['nama'] ?? '', role: json['role'] ?? '',
      );

  Map<String, dynamic> toJson() => {'id': id, 'email': email, 'nama': nama, 'role': role};
}

class AuthProvider extends ChangeNotifier {
  OrangTuaUser? _user;
  List<Child> _children = [];
  Child? _selectedChild;
  bool _isLoading = false;
  String? _error;

  OrangTuaUser? get user => _user;
  List<Child> get children => _children;
  Child? get selectedChild => _selectedChild;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  void selectChild(Child child) {
    _selectedChild = child;
    notifyListeners();
  }

  Future<void> tryAutoLogin() async {
    String? token;
    try { token = await AuthStorage.getAccessToken(); } catch (_) {}
    if (token == null) return;
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('ortu_user');
    if (userJson != null) {
      _user = OrangTuaUser.fromJson(jsonDecode(userJson));
      notifyListeners();
      await _loadChildren();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true; _error = null; notifyListeners();

    try {
      final res = await dio.post('/auth/login', data: {'nis': email, 'password': password, 'role': 'ortu'});
      final data = res.data['data'];
      final user = OrangTuaUser.fromJson(data['user']);

      if (!['ortu', 'admin'].contains(user.role)) {
        _error = 'Akses hanya untuk Orang Tua'; _isLoading = false; notifyListeners(); return false;
      }

      await AuthStorage.saveTokens(accessToken: data['accessToken'], refreshToken: data['refreshToken']);
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('ortu_user', jsonEncode(user.toJson()));

      _user = user; _isLoading = false; notifyListeners();
      await _loadChildren();
      return true;
    } catch (e) {
      _error = _parseError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> _loadChildren() async {
    try {
      final res = await dio.get('/auth/profile');
      final data = res.data['data'];
      final ortuList = data['ortu'] as List?;
      if (ortuList != null) {
        _children = ortuList
            .where((o) => o['siswa'] != null)
            .map((o) => Child.fromJson(o['siswa'] as Map<String, dynamic>))
            .toList();
      }
      if (_children.isNotEmpty) _selectedChild = _children.first;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> logout() async {
    try { await dio.post('/auth/logout'); } catch (_) {}
    await AuthStorage.clearTokens();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('ortu_user');
    _user = null; _children = []; _selectedChild = null;
    notifyListeners();
  }

  String _parseError(dynamic e) {
    try {
      if (e.response != null) {
        return e.response?.data?['message'] ?? 'Login gagal (${e.response?.statusCode})';
      }
      return 'Koneksi bermasalah: ${e.message ?? e.toString()}';
    } catch (_) {
      return 'Error: ${e.toString()}';
    }
  }
}
