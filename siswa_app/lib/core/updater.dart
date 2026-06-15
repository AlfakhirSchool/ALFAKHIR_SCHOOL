import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class AppUpdater {
  static const _repo = 'AlfakhirSchool/ALFAKHIR_SCHOOL';
  static const _assetName = 'alfakhir-siswa.apk';

  static Future<void> checkForUpdate(BuildContext context) async {
    if (!Platform.isAndroid) return;

    try {
      final info = await PackageInfo.fromPlatform();
      final currentBuild = int.tryParse(info.buildNumber) ?? 0;
      // Skip update check in dev builds (build number = 1 from pubspec default)
      if (currentBuild <= 1) return;

      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      final res = await dio.get(
        'https://api.github.com/repos/$_repo/releases/latest',
        options: Options(headers: {
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        }),
      );

      final tagName = res.data['tag_name'] as String? ?? '';
      final latestBuild =
          int.tryParse(tagName.replaceAll(RegExp(r'[^0-9]'), '')) ?? 0;

      if (latestBuild <= currentBuild) return;

      final assets = res.data['assets'] as List? ?? [];
      final asset = assets.cast<Map>().firstWhere(
            (a) => (a['name'] as String? ?? '') == _assetName,
            orElse: () => {},
          );
      if (asset.isEmpty) return;

      final downloadUrl = asset['browser_download_url'] as String? ?? '';
      if (downloadUrl.isEmpty) return;

      if (context.mounted) {
        _showDialog(context, tagName, downloadUrl);
      }
    } catch (_) {}
  }

  static void _showDialog(
      BuildContext context, String version, String downloadUrl) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: const Text('Update Tersedia 🎉'),
        content: Text(
          'Versi terbaru ($version) sudah tersedia.\n\n'
          'Tap "Update" untuk download APK baru, lalu install setelah download selesai.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Nanti'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await launchUrl(
                Uri.parse(downloadUrl),
                mode: LaunchMode.externalApplication,
              );
            },
            child: const Text('Update Sekarang'),
          ),
        ],
      ),
    );
  }
}
