import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    tz.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Jakarta'));

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await _plugin.initialize(
      const InitializationSettings(android: android),
    );
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    _initialized = true;
  }

  static Future<void> scheduleJadwal(List<Map<String, dynamic>> jadwalList) async {
    // Batalkan semua notif jadwal lama
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

    int id = 0;
    for (final jadwal in jadwalList) {
      final hariNum = hariMap[jadwal['hari']];
      if (hariNum == null) continue;

      final parts = (jadwal['jam_mulai'] as String).split(':');
      final jam = int.tryParse(parts[0]) ?? 0;
      final menit = int.tryParse(parts[1]) ?? 0;

      // Cari tanggal berikutnya untuk hari ini
      for (int week = 0; week < 4; week++) {
        int daysAhead = hariNum - now.weekday + (week * 7);
        if (daysAhead < 0) daysAhead += 7;

        final targetDate = DateTime(now.year, now.month, now.day + daysAhead, jam, menit);
        final notifTime = targetDate.subtract(const Duration(minutes: 5));

        if (notifTime.isBefore(now)) continue;

        final tzTime = tz.TZDateTime.from(notifTime, tz.local);

        await _plugin.zonedSchedule(
          id++,
          '📚 ${jadwal['mapel'] ?? 'Pelajaran'} dalam 5 menit',
          '${jadwal['hari']} ${jadwal['jam_mulai']} – ${jadwal['jam_selesai']} · ${jadwal['kelas'] ?? ''}',
          tzTime,
          NotificationDetails(
            android: AndroidNotificationDetails(
              'jadwal_channel',
              'Jadwal Pelajaran',
              channelDescription: 'Notifikasi 5 menit sebelum pelajaran',
              importance: Importance.high,
              priority: Priority.high,
              icon: '@mipmap/ic_launcher',
            ),
          ),
          androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
          uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
        );
      }
    }
  }

  static Future<void> cancelAll() => _plugin.cancelAll();
}
