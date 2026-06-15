import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'core/updater.dart';
import 'providers/auth_provider.dart';
import 'providers/data_provider.dart';
import 'screens/login_screen.dart';
import 'screens/main_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AlFakhirOrangTuaApp());
}

class AlFakhirOrangTuaApp extends StatelessWidget {
  const AlFakhirOrangTuaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DataProvider()),
      ],
      child: MaterialApp(
        title: 'Al Fakhir - Orang Tua',
        theme: appTheme,
        debugShowCheckedModeBanner: false,
        home: const AppGate(),
      ),
    );
  }
}

class AppGate extends StatefulWidget {
  const AppGate({super.key});

  @override
  State<AppGate> createState() => _AppGateState();
}

class _AppGateState extends State<AppGate> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await context.read<AuthProvider>().tryAutoLogin();
    setState(() => _initialized = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) AppUpdater.checkForUpdate(context);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        backgroundColor: colorNavy,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Image(image: AssetImage('assets/images/app_icon.png'), width: 110),
              SizedBox(height: 16),
              Text('Pantau Anak Anda', style: TextStyle(color: Colors.white70, fontSize: 16)),
              SizedBox(height: 32),
              CircularProgressIndicator(color: colorAccent),
            ],
          ),
        ),
      );
    }

    return context.watch<AuthProvider>().isLoggedIn ? const MainScreen() : const LoginScreen();
  }
}
