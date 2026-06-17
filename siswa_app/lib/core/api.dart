import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dns_helper.dart';

const String baseUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3001/api');
const _storage = FlutterSecureStorage(
  aOptions: AndroidOptions(
    encryptedSharedPreferences: true,
    resetOnError: true,
  ),
);

HttpClient _createHttpClient() {
  final client = HttpClient();
  client.connectionFactory = (uri, proxyHost, proxyPort) async {
    final port = uri.port == 0 ? (uri.scheme == 'https' ? 443 : 80) : uri.port;
    String ip;
    try {
      final addresses = await InternetAddress.lookup(uri.host)
          .timeout(const Duration(seconds: 4));
      ip = addresses.first.address;
    } catch (_) {
      ip = await DnsHelper.resolveViaDoH(uri.host);
    }
    return Socket.startConnect(ip, port);
  };
  return client;
}

Dio createDio() {
  final dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 20),
    receiveTimeout: const Duration(seconds: 30),
    headers: {'Content-Type': 'application/json'},
  ));

  dio.httpClientAdapter = IOHttpClientAdapter(createHttpClient: _createHttpClient);

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      try {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
      } catch (_) {}
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
