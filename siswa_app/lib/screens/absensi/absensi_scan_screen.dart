import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class AbsensiScanScreen extends StatefulWidget {
  const AbsensiScanScreen({super.key});

  @override
  State<AbsensiScanScreen> createState() => _AbsensiScanScreenState();
}

class _AbsensiScanScreenState extends State<AbsensiScanScreen> {
  // 'menu' | 'scan' | 'code' | 'result'
  String _mode = 'menu';
  final _codeController = TextEditingController();
  bool _loading = false;
  String? _resultMessage;
  bool _resultSuccess = false;
  final MobileScannerController _scannerCtrl = MobileScannerController();

  @override
  void dispose() {
    _codeController.dispose();
    _scannerCtrl.dispose();
    super.dispose();
  }

  String? _getSiswaId() {
    return context.read<AuthProvider>().profile?.id;
  }

  Future<void> _submitQrData(String rawQrData) async {
    if (_loading) return;
    setState(() { _loading = true; _mode = 'result'; });
    final siswaId = _getSiswaId();
    if (siswaId == null) {
      setState(() { _resultSuccess = false; _resultMessage = 'Profil siswa tidak ditemukan. Silakan login ulang.'; _loading = false; });
      return;
    }
    try {
      await dio.post('/absensi/scan-qr', data: {'qr_data': rawQrData, 'siswa_id': siswaId});
      setState(() { _resultSuccess = true; _resultMessage = 'Absensi berhasil dicatat!'; _loading = false; });
    } catch (e) {
      final msg = _parseError(e);
      setState(() { _resultSuccess = false; _resultMessage = msg; _loading = false; });
    }
  }

  Future<void> _submitCode() async {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Kode harus 6 digit')));
      return;
    }
    setState(() { _loading = true; _mode = 'result'; });
    final siswaId = _getSiswaId();
    if (siswaId == null) {
      setState(() { _resultSuccess = false; _resultMessage = 'Profil siswa tidak ditemukan. Silakan login ulang.'; _loading = false; });
      return;
    }
    try {
      await dio.post('/absensi/input-code', data: {'code': code, 'siswa_id': siswaId});
      setState(() { _resultSuccess = true; _resultMessage = 'Absensi berhasil dicatat!'; _loading = false; });
    } catch (e) {
      final msg = _parseError(e);
      setState(() { _resultSuccess = false; _resultMessage = msg; _loading = false; });
    }
  }

  String _parseError(dynamic e) {
    try {
      final data = e.response?.data;
      if (data is Map && data['message'] != null) return data['message'];
      return 'Gagal: ${e.message ?? e.toString()}';
    } catch (_) {
      return 'Terjadi kesalahan';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Absensi'),
        backgroundColor: colorSMP,
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_mode == 'scan' || _mode == 'code') {
              setState(() => _mode = 'menu');
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    switch (_mode) {
      case 'scan':
        return _ScanView(
          key: const ValueKey('scan'),
          controller: _scannerCtrl,
          onDetect: (barcode) {
            final raw = barcode.barcodes.firstOrNull?.rawValue;
            if (raw != null && raw.isNotEmpty) {
              _scannerCtrl.stop();
              _submitQrData(raw);
            }
          },
        );
      case 'code':
        return _CodeView(key: const ValueKey('code'), controller: _codeController, loading: _loading, onSubmit: _submitCode);
      case 'result':
        return _ResultView(
          key: const ValueKey('result'),
          success: _resultSuccess,
          message: _resultMessage ?? '',
          loading: _loading,
          onRetry: () => setState(() { _mode = 'menu'; _codeController.clear(); }),
        );
      default:
        return _MenuView(
          key: const ValueKey('menu'),
          onScan: () { _scannerCtrl.start(); setState(() => _mode = 'scan'); },
          onCode: () => setState(() => _mode = 'code'),
        );
    }
  }
}

class _MenuView extends StatelessWidget {
  final VoidCallback onScan;
  final VoidCallback onCode;

  const _MenuView({super.key, required this.onScan, required this.onCode});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.qr_code_scanner, size: 80, color: colorSMP),
          const SizedBox(height: 24),
          const Text('Pilih Cara Absensi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: colorNavy)),
          const SizedBox(height: 8),
          const Text('Scan QR code yang ditampilkan guru, atau masukkan kode 6 digit jika kamera tidak tersedia.',
              textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 40),
          _OptionCard(
            icon: Icons.qr_code_2,
            title: 'Scan QR Code',
            subtitle: 'Arahkan kamera ke QR code guru',
            color: colorSMP,
            onTap: onScan,
          ),
          const SizedBox(height: 16),
          _OptionCard(
            icon: Icons.keyboard,
            title: 'Input Kode Manual',
            subtitle: 'Ketik kode 6 digit dari guru',
            color: colorSMA,
            onTap: onCode,
          ),
        ],
      ),
    );
  }
}

class _OptionCard extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final Color color;
  final VoidCallback onTap;

  const _OptionCard({required this.icon, required this.title, required this.subtitle, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(16),
          color: color.withOpacity(0.05),
        ),
        child: Row(
          children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: color)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: color),
          ],
        ),
      ),
    );
  }
}

class _ScanView extends StatelessWidget {
  final MobileScannerController controller;
  final void Function(BarcodeCapture) onDetect;

  const _ScanView({super.key, required this.controller, required this.onDetect});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MobileScanner(controller: controller, onDetect: onDetect),
        // Overlay
        ColorFiltered(
          colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.5), BlendMode.srcOut),
          child: Stack(
            children: [
              Container(decoration: const BoxDecoration(color: Colors.black, backgroundBlendMode: BlendMode.dstOut)),
              Center(
                child: Container(
                  width: 240, height: 240,
                  decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ],
          ),
        ),
        Center(
          child: Container(
            width: 240, height: 240,
            decoration: BoxDecoration(
              border: Border.all(color: colorSMP, width: 3),
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        Positioned(bottom: 60, left: 0, right: 0,
          child: const Text('Arahkan QR code ke dalam kotak', textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 14))),
      ],
    );
  }
}

class _CodeView extends StatelessWidget {
  final TextEditingController controller;
  final bool loading;
  final VoidCallback onSubmit;

  const _CodeView({super.key, required this.controller, required this.loading, required this.onSubmit});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.pin, size: 64, color: colorSMA),
          const SizedBox(height: 24),
          const Text('Masukkan Kode Absensi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: colorNavy)),
          const SizedBox(height: 8),
          const Text('Ketik kode 6 digit yang diberikan guru', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 32),
          TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 12),
            decoration: InputDecoration(
              hintText: '______',
              hintStyle: const TextStyle(color: Colors.grey, letterSpacing: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: colorSMA, width: 2),
              ),
              counterText: '',
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: loading ? null : onSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: colorSMA,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Kirim Absensi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultView extends StatelessWidget {
  final bool success, loading;
  final String message;
  final VoidCallback onRetry;

  const _ResultView({super.key, required this.success, required this.message, required this.loading, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(color: colorSMP),
          SizedBox(height: 16),
          Text('Mencatat absensi...', style: TextStyle(color: Colors.grey)),
        ],
      ));
    }
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(success ? Icons.check_circle : Icons.error, size: 80, color: success ? colorSuccess : colorError),
          const SizedBox(height: 24),
          Text(success ? 'Absensi Berhasil!' : 'Absensi Gagal',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: success ? colorSuccess : colorError)),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: Colors.grey)),
          const SizedBox(height: 40),
          if (success)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: colorSuccess,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Selesai', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            )
          else
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onRetry,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: colorSMP),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Coba Lagi', style: TextStyle(fontSize: 16, color: colorSMP, fontWeight: FontWeight.bold)),
              ),
            ),
        ],
      ),
    );
  }
}
