import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/data_provider.dart';
import 'home/home_tab.dart';
import 'nilai/nilai_tab.dart';
import 'absensi/absensi_tab.dart';
import 'jadwal/jadwal_tab.dart';
import 'pembayaran/pembayaran_tab.dart';
import 'rapor/rapor_tab.dart';
import 'notifikasi/notifikasi_tab.dart';

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
    PembayaranTab(),
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
      data.loadPembayaran(auth.profile!.id);
      data.loadNotifikasi();
      if (auth.profile!.kelasId != null) {
        data.loadJadwal(auth.profile!.kelasId!);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.watch<DataProvider>().unreadNotifikasi;

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _tabs),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Beranda'),
          const BottomNavigationBarItem(icon: Icon(Icons.bar_chart_outlined), activeIcon: Icon(Icons.bar_chart), label: 'Nilai'),
          const BottomNavigationBarItem(icon: Icon(Icons.check_circle_outline), activeIcon: Icon(Icons.check_circle), label: 'Absensi'),
          const BottomNavigationBarItem(icon: Icon(Icons.calendar_today_outlined), activeIcon: Icon(Icons.calendar_today), label: 'Jadwal'),
          const BottomNavigationBarItem(icon: Icon(Icons.payment_outlined), activeIcon: Icon(Icons.payment), label: 'Bayar'),
          const BottomNavigationBarItem(icon: Icon(Icons.description_outlined), activeIcon: Icon(Icons.description), label: 'Rapor'),
          BottomNavigationBarItem(
            icon: Badge(isLabelVisible: unread > 0, label: Text('$unread'), child: const Icon(Icons.notifications_outlined)),
            activeIcon: Badge(isLabelVisible: unread > 0, label: Text('$unread'), child: const Icon(Icons.notifications)),
            label: 'Notifikasi',
          ),
        ],
      ),
    );
  }
}
