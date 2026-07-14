import 'dart:convert';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;

const _kJadwalKey = 'cached_jadwal_notif';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Jakarta'));

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(const InitializationSettings(android: android));
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    _initialized = true;

    // Reschedule dari cache (untuk kasus setelah reboot)
    await _rescheduleFromCache();
  }

  static Future<void> scheduleJadwal(List<Map<String, dynamic>> jadwalList) async {
    // Simpan jadwal ke cache untuk reschedule setelah reboot
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kJadwalKey, jsonEncode(jadwalList));

    await _doSchedule(jadwalList);
  }

  static Future<void> _rescheduleFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kJadwalKey);
      if (raw == null) return;
      final list = (jsonDecode(raw) as List).cast<Map<String, dynamic>>();
      await _doSchedule(list);
    } catch (_) {}
  }

  static Future<void> _doSchedule(List<Map<String, dynamic>> jadwalList) async {
    await _plugin.cancelAll();

    final now = DateTime.now();
    final hariMap = {
      'Senin': DateTime.monday,
      'Selasa': DateTime.tuesday,
      'Rabu': DateTime.wednesday,
      'Kamis': DateTime.thursday,
      'Jumat': DateTime.friday,
      'Sabtu': DateTime.saturday,
    };

    const notifDetails = NotificationDetails(
      android: AndroidNotificationDetails(
        'jadwal_channel',
        'Jadwal Pelajaran',
        channelDescription: 'Notifikasi 5 menit sebelum pelajaran dimulai',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
      ),
    );

    int id = 0;
    for (final jadwal in jadwalList) {
      final hariNum = hariMap[jadwal['hari']];
      if (hariNum == null) continue;

      final parts = (jadwal['jam_mulai'] as String).split(':');
      final jam = int.tryParse(parts[0]) ?? 0;
      final menit = int.tryParse(parts[1]) ?? 0;

      // Schedule 4 minggu ke depan per jadwal
      for (int week = 0; week < 4; week++) {
        int daysAhead = hariNum - now.weekday + (week * 7);
        if (daysAhead < 0) daysAhead += 7;

        final targetDate = DateTime(now.year, now.month, now.day + daysAhead, jam, menit);
        final notifTime = targetDate.subtract(const Duration(minutes: 5));

        if (notifTime.isBefore(now)) continue;

        await _plugin.zonedSchedule(
          id++,
          '📚 ${jadwal['mapel'] ?? 'Pelajaran'} dalam 5 menit',
          '${jadwal['hari']} · ${jadwal['jam_mulai']} – ${jadwal['jam_selesai']}',
          tz.TZDateTime.from(notifTime, tz.local),
          notifDetails,
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          uiLocalNotificationDateInterpretation:
              UILocalNotificationDateInterpretation.absoluteTime,
        );
      }
    }
  }

  static Future<void> cancelAll() async {
    await _plugin.cancelAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kJadwalKey);
  }
}
