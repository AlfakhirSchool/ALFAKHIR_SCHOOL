import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../core/api.dart';
import '../core/storage.dart';
import '../models/user.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  SiswaProfile? _profile;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  SiswaProfile? get profile => _profile;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  Future<void> tryAutoLogin() async {
    final token = await AuthStorage.getAccessToken();
    if (token == null) return;

    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('current_user');
    if (userJson != null) {
      _user = User.fromJson(jsonDecode(userJson));
      notifyListeners();
      await loadProfile();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = res.data['data'];
      final user = User.fromJson(data['user']);

      if (user.role != 'siswa') {
        _error = 'Akses hanya untuk siswa';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      await AuthStorage.saveTokens(
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', jsonEncode(user.toJson()));

      _user = user;
      _isLoading = false;
      notifyListeners();

      await loadProfile();
      return true;
    } catch (e) {
      _error = _parseError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> loadProfile() async {
    try {
      final res = await dio.get('/auth/profile');
      final data = res.data['data'];
      if (data['siswa'] != null) {
        _profile = SiswaProfile.fromJson(data['siswa']);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> logout() async {
    try { await dio.post('/auth/logout'); } catch (_) {}
    await AuthStorage.clearTokens();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('current_user');
    _user = null;
    _profile = null;
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
