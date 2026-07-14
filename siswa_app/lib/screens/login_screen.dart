import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nisCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _nisCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final ok = await auth.login(_nisCtrl.text.trim(), _passwordCtrl.text);
    if (!ok && mounted) {
      if (auth.error == 'DEVICE_LOCKED') {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Perangkat Terkunci'),
            content: const Text(
              'Akun ini sudah terdaftar di perangkat lain.\n\nHubungi admin sekolah untuk mereset perangkat anda.',
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.error ?? 'Login gagal'),
            backgroundColor: colorError,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [colorNavy, colorSMA],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Logo
                  Image.asset(
                    'assets/images/logo_alfakhir.png',
                    width: 260,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 8),
                  const Text('Portal Siswa', style: TextStyle(color: Colors.white70, fontSize: 14)),
                  const SizedBox(height: 40),

                  // Card
                  Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('Masuk', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: colorNavy)),
                            const SizedBox(height: 4),
                            const Text('Masukkan NIS dan password kamu', style: TextStyle(color: Colors.grey, fontSize: 13)),
                            const SizedBox(height: 24),

                            TextFormField(
                              controller: _nisCtrl,
                              keyboardType: TextInputType.number,
                              style: const TextStyle(color: Colors.black87),
                              decoration: const InputDecoration(
                                labelText: 'NIS',
                                prefixIcon: Icon(Icons.badge_outlined),
                                hintText: 'Nomor Induk Siswa',
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'NIS diperlukan' : null,
                            ),
                            const SizedBox(height: 16),

                            TextFormField(
                              controller: _passwordCtrl,
                              obscureText: _obscure,
                              style: const TextStyle(color: Colors.black87),
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) => v == null || v.isEmpty ? 'Password diperlukan' : null,
                            ),
                            const SizedBox(height: 28),

                            ElevatedButton(
                              onPressed: auth.isLoading ? null : _login,
                              child: auth.isLoading
                                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text('Masuk'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),
                  const Text('SD/SMP/SMA Islam Modern Al Fakhir', style: TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
