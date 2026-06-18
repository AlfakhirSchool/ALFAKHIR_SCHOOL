import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/api.dart';
import '../../core/theme.dart';
import '../../core/school_theme.dart';
import '../../providers/auth_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _uploading = false;

  Future<void> _pickAndUpload(ImageSource source) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: source, imageQuality: 80, maxWidth: 800);
    if (picked == null) return;

    setState(() => _uploading = true);
    final auth = context.read<AuthProvider>();
    final url = await auth.uploadProfilePhoto(File(picked.path));
    setState(() => _uploading = false);

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(url != null ? 'Foto profil berhasil diupdate' : 'Gagal mengupload foto'),
      backgroundColor: url != null ? colorSuccess : colorError,
    ));
  }

  void _showPickerSheet() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined),
              title: const Text('Ambil Foto'),
              onTap: () { Navigator.pop(context); _pickAndUpload(ImageSource.camera); },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Pilih dari Galeri'),
              onTap: () { Navigator.pop(context); _pickAndUpload(ImageSource.gallery); },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final profile = auth.profile;
    final school = SchoolTheme.fromLevel(profile?.sekolahLevel);

    final picUrl = user?.profilePic;
    final fullUrl = picUrl != null ? '${baseUrl.replaceAll('/api', '')}$picUrl' : null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil Saya'),
        backgroundColor: school.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const SizedBox(height: 16),

            // Avatar
            Stack(
              alignment: Alignment.bottomRight,
              children: [
                GestureDetector(
                  onTap: _showPickerSheet,
                  child: CircleAvatar(
                    radius: 64,
                    backgroundColor: school.primary.withOpacity(0.15),
                    backgroundImage: fullUrl != null ? NetworkImage(fullUrl) : null,
                    child: _uploading
                        ? const CircularProgressIndicator()
                        : fullUrl == null
                            ? Text(
                                (user?.nama ?? 'S').substring(0, 1).toUpperCase(),
                                style: TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: school.primary),
                              )
                            : null,
                  ),
                ),
                GestureDetector(
                  onTap: _showPickerSheet,
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: school.primary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),
            Text('Ketuk foto untuk mengubah', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            const SizedBox(height: 24),

            // Info
            _InfoCard(children: [
              _InfoRow(icon: Icons.person_outline, label: 'Nama', value: user?.nama ?? '-'),
              _InfoRow(icon: Icons.badge_outlined, label: 'NIS', value: profile?.nis ?? '-'),
              _InfoRow(icon: Icons.numbers_outlined, label: 'NISN', value: profile?.nisn ?? '-'),
              _InfoRow(icon: Icons.class_outlined, label: 'Kelas', value: profile?.kelasNama ?? '-'),
              _InfoRow(icon: Icons.school_outlined, label: 'Sekolah', value: profile?.sekolahNama ?? '-'),
              _InfoRow(icon: Icons.email_outlined, label: 'Email', value: user?.email ?? '-'),
            ]),

            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('Keluar'),
                      content: const Text('Yakin ingin keluar dari akun ini?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Keluar', style: TextStyle(color: Colors.red)),
                        ),
                      ],
                    ),
                  );
                  if (confirmed == true && context.mounted) {
                    await context.read<AuthProvider>().logout();
                  }
                },
                icon: const Icon(Icons.logout, color: colorError),
                label: const Text('Keluar', style: TextStyle(color: colorError)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: colorError),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final List<Widget> children;
  const _InfoCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(children: children),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey),
          const SizedBox(width: 12),
          SizedBox(width: 80, child: Text(label, style: const TextStyle(color: Colors.grey, fontSize: 13))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14))),
        ],
      ),
    );
  }
}
