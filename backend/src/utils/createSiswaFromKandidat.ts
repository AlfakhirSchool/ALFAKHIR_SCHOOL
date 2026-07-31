import bcrypt from 'bcrypt';
import sequelize from '../config/database';
import { User, Siswa } from '../models';

interface CreateSiswaOptions {
  nama: string;
  kelas_id: string;
  nisn?: string | null;
  nis?: string | null;
  no_induk?: string | null;
  jenis_kelamin?: string | null;
  tanggal_lahir?: Date | string | null;
  observasi_kandidat_id?: string | null;
}

export async function createSiswaWithAccount(opts: CreateSiswaOptions): Promise<{ user: any; siswa: any; email: string; password: string }> {
  const slug = opts.nama.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  const ts = Date.now().toString().slice(-4);
  const autoEmail = `${slug}.${ts}@siswa.alfakhir.sch.id`;
  const autoPassword = Math.random().toString(36).slice(-6).toUpperCase();
  const password_hash = await bcrypt.hash(autoPassword, 10);

  const t = await sequelize.transaction();
  try {
    const user = await User.create({
      email: autoEmail, password_hash, nama: opts.nama,
      role: 'siswa', password_default: autoPassword, is_active: true,
    } as any, { transaction: t });

    const siswa = await Siswa.create({
      user_id: (user as any).id,
      kelas_id: opts.kelas_id,
      nisn: opts.nisn || null,
      nis: opts.nis || null,
      no_induk: opts.no_induk || opts.nis || null,
      jenis_kelamin: opts.jenis_kelamin || null,
      tanggal_lahir: opts.tanggal_lahir ? new Date(opts.tanggal_lahir as string) : null,
      observasi_kandidat_id: opts.observasi_kandidat_id || null,
    } as any, { transaction: t });

    await t.commit();
    return { user, siswa, email: autoEmail, password: autoPassword };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
