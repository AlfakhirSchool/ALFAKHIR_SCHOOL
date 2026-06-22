import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/data_provider.dart';
import 'home/home_tab.dart';
import 'nilai/nilai_tab.dart';
import 'absensi/absensi_tab.dart';
import 'jadwal/jadwal_tab.dart';
import 'rapor/rapor_tab.dart';
import 'notifikasi/notifikasi_tab.dart';
import 'absensi/absensi_scan_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _tabs = const [
    HomeTab(),
    NilaiTab(),
    AbsensiTab(),
    JadwalTab(),
    RaporTab(),
    NotifikasiTab(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInitialData());
  }

  void _loadInitialData() {
    final auth = context.read<AuthProvider>();
    final data = context.read<DataProvider>();
    if (auth.profile != null) {
      data.loadDashboard();
      data.loadNilai(auth.profile!.id);
      data.loadAbsensi(auth.profile!.id);
      data.loadNotifikasi();
      if (auth.profile!.kelasId != null) {
        data.loadJadwal(auth.profile!.kelasId!);
      }
    }
  }

  void _openQrScan() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AbsensiScanScreen(directScan: true)),
    );
  }

  Widget _navItem(int index, IconData icon, IconData activeIcon, String label) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? colorSMA : const Color(0xFF94A3B8);
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        customBorder: const CircleBorder(),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(isSelected ? activeIcon : icon, color: color, size: 22),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  color: color,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.watch<DataProvider>().unreadNotifikasi;
    final notifSelected = _currentIndex == 5;
    final notifColor = notifSelected ? colorSMA : const Color(0xFF94A3B8);

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _tabs),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: _openQrScan,
        backgroundColor: colorSMP,
        elevation: 4,
        shape: const CircleBorder(),
        child: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 28),
      ),
      bottomNavigationBar: BottomAppBar(
        notchMargin: 8,
        shape: const CircularNotchedRectangle(),
        color: Colors.white,
        elevation: 8,
        padding: EdgeInsets.zero,
        child: SizedBox(
          height: 56,
          child: Row(
            children: [
              _navItem(0, Icons.home_outlined, Icons.home, 'Beranda'),
              _navItem(1, Icons.bar_chart_outlined, Icons.bar_chart, 'Nilai'),
              _navItem(2, Icons.check_circle_outline, Icons.check_circle, 'Absensi'),
              const Expanded(child: SizedBox()), // gap for center FAB
              _navItem(3, Icons.calendar_today_outlined, Icons.calendar_today, 'Jadwal'),
              _navItem(4, Icons.description_outlined, Icons.description, 'Rapor'),
              Expanded(
                child: InkWell(
                  onTap: () => setState(() => _currentIndex = 5),
                  customBorder: const CircleBorder(),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Badge(
                          isLabelVisible: unread > 0,
                          label: Text('$unread'),
                          child: Icon(
                            notifSelected ? Icons.notifications : Icons.notifications_outlined,
                            color: notifColor,
                            size: 22,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Notifikasi',
                          style: TextStyle(
                            fontSize: 10,
                            color: notifColor,
                            fontWeight: notifSelected ? FontWeight.w600 : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
