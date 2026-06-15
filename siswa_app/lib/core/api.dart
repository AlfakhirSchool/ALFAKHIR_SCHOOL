import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

// dart-define: API_URL=https://api.alfakhirschool.id/api
// flutter build apk --dart-define=API_URL=https://api.alfakhirschool.id/api
const String baseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3001/api');
const _storage = FlutterSecureStorage();

Dio createDio() {
  final dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        final refreshToken = await _storage.read(key: 'refresh_token');
        if (refreshToken != null) {
          try {
            final res = await Dio().post('$baseUrl/auth/refresh',
                data: {'refreshToken': refreshToken});
            final newToken = res.data['data']['accessToken'];
            await _storage.write(key: 'access_token', value: newToken);
            error.requestOptions.headers['Authorization'] = 'Bearer $newToken';
            final retryRes = await dio.fetch(error.requestOptions);
            return handler.resolve(retryRes);
          } catch (_) {
            await _storage.deleteAll();
          }
        }
      }
      handler.next(error);
    },
  ));

  return dio;
}

final dio = createDio();
