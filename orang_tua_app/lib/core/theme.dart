import 'package:flutter/material.dart';

const Color colorPrimary = Color(0xFF1B8B87);
const Color colorAccent = Color(0xFFFF8C42);
const Color colorNavy = Color(0xFF1A2332);
const Color colorSuccess = Color(0xFF10B981);
const Color colorWarning = Color(0xFFF59E0B);
const Color colorError = Color(0xFFEF4444);
const Color colorBg = Color(0xFFF5F5F5);

ThemeData appTheme = ThemeData(
  useMaterial3: true,
  colorScheme: ColorScheme.fromSeed(
    seedColor: colorPrimary,
    primary: colorPrimary,
    secondary: colorAccent,
  ),
  fontFamily: 'Poppins',
  scaffoldBackgroundColor: colorBg,
  appBarTheme: const AppBarTheme(
    backgroundColor: colorNavy,
    foregroundColor: Colors.white,
    elevation: 0,
    titleTextStyle: TextStyle(
      fontFamily: 'Poppins', fontSize: 17, fontWeight: FontWeight.w600, color: Colors.white,
    ),
  ),
  cardTheme: CardThemeData(
    elevation: 0,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    color: Colors.white,
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: colorPrimary,
      foregroundColor: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
      textStyle: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 15),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: colorPrimary, width: 2)),
    filled: true,
    fillColor: Colors.white,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    selectedItemColor: colorPrimary,
    unselectedItemColor: Color(0xFF94A3B8),
    backgroundColor: Colors.white,
    type: BottomNavigationBarType.fixed,
    elevation: 8,
  ),
);
