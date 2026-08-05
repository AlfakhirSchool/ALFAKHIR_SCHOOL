import { JawabanForm, Kandidat, CatatanPewawancara } from '../models';

export const getByKandidat = async (req: any, res: any): Promise<void> => {
  const data = await JawabanForm.findAll({
    where: { kandidat_id: req.params.kandidat_id as string },
    order: [['created_at', 'ASC']],
  });
  res.json({ success: true, data });
};

export const submit = async (req: any, res: any): Promise<void> => {
  const { role, jawaban } = req.body;
  const kandidat_id = req.params.kandidat_id as string;

  if (!role || !jawaban) { res.status(400).json({ success: false, message: 'role dan jawaban wajib' }); return; }

  const k = await Kandidat.findByPk(kandidat_id, { attributes: ['id', 'status'] });
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }

  // Cegah overwrite jawaban yang sudah final
  const existing = await JawabanForm.findOne({ where: { kandidat_id, role } });
  if (existing && (existing as any).is_final) {
    res.status(409).json({ success: false, message: 'Jawaban sudah dikunci dan tidak bisa diubah' });
    return;
  }

  const [record] = await JawabanForm.upsert({ kandidat_id, role, jawaban, is_final: true });
  if (k.status === 'PENDING') await k.update({ status: 'REVIEW' });

  res.json({ success: true, data: record });
};

export const getActivityFeed = async (req: any, res: any): Promise<void> => {
  try {
  const [recentCatatan, recentJawaban, recentKandidat] = await Promise.all([
    CatatanPewawancara.findAll({
      limit: 5, order: [['created_at', 'DESC']],
      include: [{ model: Kandidat, as: 'kandidat', attributes: ['id', 'nama', 'nama_diperbaiki', 'level'] }],
    }),
    JawabanForm.findAll({
      limit: 5, order: [['created_at', 'DESC']],
      include: [{ model: Kandidat, as: 'kandidat', attributes: ['id', 'nama', 'nama_diperbaiki', 'level'] }],
    }),
    Kandidat.findAll({
      limit: 5, order: [['created_at', 'DESC']],
      attributes: ['id', 'nama', 'nama_diperbaiki', 'level', 'status', 'created_at'],
    }),
  ]);

  const feed = [
    ...recentCatatan.map((c: any) => ({
      id: c.id, type: 'catatan',
      title: 'Catatan Pewawancara',
      desc: `${c.pewawancara_nama || 'Pewawancara'} menambahkan catatan untuk ${c.kandidat?.nama_diperbaiki || c.kandidat?.nama || ''}`,
      level: c.kandidat?.level,
      kandidat_id: c.kandidat_id,
      time: c.created_at,
    })),
    ...recentJawaban.map((j: any) => ({
      id: j.id, type: 'form',
      title: j.role === 'ortu' ? 'Formulir Orang Tua' : 'Formulir Siswa',
      desc: `${j.kandidat?.nama_diperbaiki || j.kandidat?.nama || ''} mengirim jawaban formulir`,
      level: j.kandidat?.level,
      kandidat_id: j.kandidat_id,
      time: j.created_at,
    })),
    ...recentKandidat.map((k: any) => ({
      id: k.id, type: 'kandidat',
      title: 'Kandidat Baru',
      desc: `${k.nama_diperbaiki || k.nama} (${k.level}) mendaftar`,
      level: k.level,
      kandidat_id: k.id,
      time: k.created_at,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

  res.json({ success: true, data: feed });
  } catch (e: any) {
    console.error('getActivityFeed error:', e?.message);
    res.status(500).json({ success: false, message: 'Gagal memuat activity feed' });
  }
};
