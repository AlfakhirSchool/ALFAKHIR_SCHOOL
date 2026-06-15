class User {
  final String id;
  final String email;
  final String nama;
  final String role;
  final bool isActive;
  final String? profilePic;

  const User({
    required this.id,
    required this.email,
    required this.nama,
    required this.role,
    required this.isActive,
    this.profilePic,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] ?? '',
        email: json['email'] ?? '',
        nama: json['nama'] ?? '',
        role: json['role'] ?? '',
        isActive: json['is_active'] ?? true,
        profilePic: json['profile_pic'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'nama': nama,
        'role': role,
        'is_active': isActive,
        'profile_pic': profilePic,
      };
}

class SiswaProfile {
  final String id;
  final String userId;
  final String? nisn;
  final String? nis;
  final String? kelasNama;
  final String? kelasId;
  final String? sekolahNama;
  final String? sekolahLevel;
  final User user;

  const SiswaProfile({
    required this.id,
    required this.userId,
    required this.user,
    this.nisn,
    this.nis,
    this.kelasNama,
    this.kelasId,
    this.sekolahNama,
    this.sekolahLevel,
  });

  factory SiswaProfile.fromJson(Map<String, dynamic> json) => SiswaProfile(
        id: json['id'] ?? '',
        userId: json['user_id'] ?? '',
        user: User.fromJson(json['user'] ?? {}),
        nisn: json['nisn'],
        nis: json['nis'],
        kelasNama: json['kelas']?['nama'],
        kelasId: json['kelas_id'],
        sekolahNama: json['kelas']?['sekolah']?['nama'],
        sekolahLevel: json['kelas']?['sekolah']?['level'],
      );
}
