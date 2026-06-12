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
      // TODO: Show local notification with flutter_local_notifications
    });

    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final type = message.data['type'];
      debugPrint('FCM Opened: type=$type');
      // Navigate based on type: payment_created, payment_confirmed, payment_overdue
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
      }
    } catch (e) {
      debugPrint('FCM register error: $e');
    }
  }
}
