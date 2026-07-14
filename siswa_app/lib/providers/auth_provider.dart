import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/api.dart';
import '../core/storage.dart';
import '../models/user.dart';

const _secureStorage = FlutterSecureStorage();

Future<String> _getOrCreateDeviceId() async {
  String? id = await _secureStorage.read(key: 'device_id');
  if (id == null) {
    id = DateTime.now().millisecondsSinceEpoch.toString() +
        '-' +
        (1000000 + (999999 * (DateTime.now().microsecond / 999999)).round()).toString();
    await _secureStorage.write(key: 'device_id', value: id);
  }
  return id;
}

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
    String? token;
    try { token = await AuthStorage.getAccessToken(); } catch (_) {}
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
      final deviceId = await _getOrCreateDeviceId();
      final res = await dio.post('/auth/login', data: {
        'nis': email,
        'password': password,
        'role': 'siswa',
        'device_id': deviceId,
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
      debugPrint('LOGIN ERROR type: ${e.runtimeType}');
      debugPrint('LOGIN ERROR: $e');
      try {
        final de = e as dynamic;
        debugPrint('LOGIN response: ${de.response?.statusCode} ${de.response?.data}');
        debugPrint('LOGIN message: ${de.message}');
      } catch (_) {}
      final code = (e as dynamic).response?.data?['code'];
      if (code == 'DEVICE_LOCKED') {
        _error = 'DEVICE_LOCKED';
      } else {
        _error = _parseError(e);
      }
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
        // Sync profile_pic from latest server data
        final latestPic = _profile!.user.profilePic;
        if (_user != null && latestPic != null) {
          _user = User(
            id: _user!.id,
            email: _user!.email,
            nama: _user!.nama,
            role: _user!.role,
            isActive: _user!.isActive,
            profilePic: latestPic,
          );
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('current_user', jsonEncode(_user!.toJson()));
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<String?> uploadProfilePhoto(File imageFile) async {
    try {
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(imageFile.path, filename: 'profile.jpg'),
      });
      final res = await dio.post('/auth/upload-photo', data: formData);
      final picUrl = res.data['data']['profile_pic'] as String;
      _user = User(
        id: _user!.id,
        email: _user!.email,
        nama: _user!.nama,
        role: _user!.role,
        isActive: _user!.isActive,
        profilePic: picUrl,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('current_user', jsonEncode(_user!.toJson()));
      notifyListeners();
      return picUrl;
    } catch (e) {
      return null;
    }
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
