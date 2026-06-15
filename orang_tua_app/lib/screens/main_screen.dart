import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/data_provider.dart';
import 'home/home_tab.dart';
import 'absensi/absensi_tab.dart';
import 'nilai/nilai_tab.dart';
import 'pembayaran/pembayaran_tab.dart';
import 'learning/learning_tab.dart';
import 'rapor/rapor_tab.dart';
import 'notifikasi/notifikasi_tab.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final data = context.read<DataProvider>();
      if (auth.selectedChild != null) {
        data.loadForChild(auth.selectedChild!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: const [HomeTab(), AbsensiTab(), NilaiTab(), PembayaranTab(), LearningTab(), RaporTab(), NotifikasiTab()],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) {
          setState(() => _currentIndex = i);
          if (auth.selectedChild != null) {
            context.read<DataProvider>().loadForChild(auth.selectedChild!);
          }
        },
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Beranda'),
          const BottomNavigationBarItem(icon: Icon(Icons.check_circle_outline), activeIcon: Icon(Icons.check_circle), label: 'Absensi'),
          const BottomNavigationBarItem(icon: Icon(Icons.bar_chart_outlined), activeIcon: Icon(Icons.bar_chart), label: 'Nilai'),
          const BottomNavigationBarItem(icon: Icon(Icons.payment_outlined), activeIcon: Icon(Icons.payment), label: 'Bayar'),
          const BottomNavigationBarItem(icon: Icon(Icons.book_outlined), activeIcon: Icon(Icons.book), label: 'Belajar'),
          const BottomNavigationBarItem(icon: Icon(Icons.description_outlined), activeIcon: Icon(Icons.description), label: 'Rapor'),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: context.watch<DataProvider>().unreadNotifikasi > 0,
              label: Text('${context.watch<DataProvider>().unreadNotifikasi}'),
              child: const Icon(Icons.notifications_outlined),
            ),
            activeIcon: const Icon(Icons.notifications),
            label: 'Notifikasi',
          ),
        ],
      ),
    );
  }
}
