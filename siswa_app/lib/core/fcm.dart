import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('FCM Background: ${message.messageId}');
}

class FcmService {
  static final _fcm = FirebaseMessaging.instance;

  static Future<void> init() async {
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      await _registerToken();
    }

    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('FCM Foreground: ${message.notification?.title}');
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      debugPrint('FCM Opened: ${message.data}');
    });
  }

  static Future<void> _registerToken() async {
    try {
      final token = await _fcm.getToken();
      if (token != null) {
        final dio = createDio();
        await dio.post('/notifikasi/fcm-token', data: {
          'fcm_token': token,
          'device_info': defaultTargetPlatform.toString(),
        });
        debugPrint('FCM token registered');
      }
    } catch (e) {
      debugPrint('FCM register error: $e');
    }
  }

  static Future<void> refreshToken() async {
    _fcm.onTokenRefresh.listen((_) async {
      await _registerToken();
    });
  }
}
