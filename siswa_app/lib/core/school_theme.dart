import 'package:flutter/material.dart';
import 'theme.dart';

class SchoolTheme {
  final Color primary;
  final Color dark;
  final String logoAsset;
  final String namaJenjang;
  final List<Color> gradient;

  const SchoolTheme({
    required this.primary,
    required this.dark,
    required this.logoAsset,
    required this.namaJenjang,
    required this.gradient,
  });

  static SchoolTheme fromLevel(String? level) {
    switch (level?.toUpperCase()) {
      case 'SD':
        return const SchoolTheme(
          primary: colorSD,
          dark: Color(0xFFCC6A00),
          logoAsset: 'assets/images/logo_sd.png',
          namaJenjang: 'SD Islam Modern Al Fakhir',
          gradient: [Color(0xFF7A3800), colorSD],
        );
      case 'SMA':
        return const SchoolTheme(
          primary: colorSMA,
          dark: Color(0xFF1E4F8C),
          logoAsset: 'assets/images/logo_sma.png',
          namaJenjang: 'SMA Islam Modern Al Fakhir',
          gradient: [colorNavy, colorSMA],
        );
      case 'SMP':
      default:
        return const SchoolTheme(
          primary: colorSMP,
          dark: Color(0xFF0A5450),
          logoAsset: 'assets/images/logo_smp.png',
          namaJenjang: 'SMP Islam Modern Al Fakhir',
          gradient: [Color(0xFF0A3330), colorSMP],
        );
    }
  }
}
