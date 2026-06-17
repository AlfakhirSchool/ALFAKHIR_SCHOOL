import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _secure = FlutterSecureStorage(
  aOptions: AndroidOptions(
    encryptedSharedPreferences: true,
    resetOnError: true,
  ),
);

class AuthStorage {
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _secure.write(key: 'access_token', value: accessToken);
    await _secure.write(key: 'refresh_token', value: refreshToken);
  }

  static Future<String?> getAccessToken() => _secure.read(key: 'access_token');
  static Future<String?> getRefreshToken() => _secure.read(key: 'refresh_token');

  static Future<void> clearTokens() => _secure.deleteAll();
}

class CacheStorage {
  static Future<void> saveJson(String key, String json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, json);
    await prefs.setInt('${key}_ts', DateTime.now().millisecondsSinceEpoch);
  }

  static Future<String?> getJson(String key, {int maxAgeMinutes = 10}) async {
    final prefs = await SharedPreferences.getInstance();
    final ts = prefs.getInt('${key}_ts') ?? 0;
    final age = DateTime.now().millisecondsSinceEpoch - ts;
    if (age > maxAgeMinutes * 60 * 1000) return null;
    return prefs.getString(key);
  }

  static Future<void> clear(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
    await prefs.remove('${key}_ts');
  }
}
