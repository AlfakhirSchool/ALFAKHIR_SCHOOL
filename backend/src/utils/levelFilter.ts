import { Sekolah, Kelas } from '../models';
import { Op } from 'sequelize';

// Cache sederhana per request tidak diperlukan — queries ini cepat dan di-pool oleh Postgres
export async function getSekolahIdForLevel(level: string): Promise<string | null> {
  const sekolah = await Sekolah.findOne({ where: { level } });
  return sekolah?.id ?? null;
}

export async function getKelasIdsForLevel(level: string): Promise<string[]> {
  const sekolahId = await getSekolahIdForLevel(level);
  if (!sekolahId) return [];
  const kelasList = await Kelas.findAll({ where: { sekolah_id: sekolahId }, attributes: ['id'] });
  return kelasList.map((k: any) => k.id as string);
}

// Kembalikan where clause untuk filter kelas_id, atau {} jika master (tidak ada filter)
export async function kelasIdFilter(schoolLevel: string | null | undefined): Promise<Record<string, unknown>> {
  if (!schoolLevel) return {};
  const ids = await getKelasIdsForLevel(schoolLevel);
  if (ids.length === 0) return { kelas_id: null }; // pastikan tidak ada data tampil
  return { kelas_id: { [Op.in]: ids } };
}
