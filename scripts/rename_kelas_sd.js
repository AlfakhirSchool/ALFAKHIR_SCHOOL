// Script untuk rename kelas SD di production CT101
// Jalankan dari dalam container backend: node rename_kelas_sd.js
// atau dari luar: docker exec alfakhirchool_backend node /app/rename_kelas_sd.js

const { Sequelize, DataTypes } = require('sequelize');

const seq = new Sequelize(
  process.env.DB_NAME || 'alfakhirchool',
  process.env.DB_USER || 'alfakhir',
  process.env.DB_PASS || 'winky123',
  {
    host: process.env.DB_HOST || 'postgres',
    dialect: 'postgres',
    logging: false,
  }
);

const Kelas = seq.define('kelas', {
  id: { type: DataTypes.UUID, primaryKey: true },
  nama: DataTypes.STRING,
  sekolah_id: DataTypes.UUID,
}, { tableName: 'kelas', timestamps: true, underscored: true });

const Sekolah = seq.define('sekolah', {
  id: { type: DataTypes.UUID, primaryKey: true },
  nama: DataTypes.STRING,
  level: DataTypes.STRING,
}, { tableName: 'sekolah', timestamps: true, underscored: true });

async function main() {
  await seq.authenticate();
  console.log('Connected to DB');

  // Cari sekolah SD
  const sd = await Sekolah.findOne({ where: { level: 'SD' } });
  if (!sd) {
    console.log('Sekolah SD tidak ditemukan. Membuat baru...');
    // Buat sekolah SD jika belum ada
    const newSd = await Sekolah.create({
      id: require('crypto').randomUUID(),
      nama: 'SD Islam Al-Fakhir',
      level: 'SD',
    });
    console.log('Sekolah SD dibuat:', newSd.id);
    await seq.close();
    return;
  }

  console.log('Sekolah SD:', sd.nama, 'ID:', sd.id);

  // Daftar rename kelas SD
  const renames = [
    { from: '1A', to: "1A An Na'im" },
    { from: '1B', to: "1B Al Ma'wa" },
    { from: '1C', to: '1C Al Adn' },
    { from: '1D', to: '1D Darussalamini' },
  ];

  // Cari semua kelas milik SD
  const kelasList = await Kelas.findAll({ where: { sekolah_id: sd.id } });
  console.log('Kelas SD ditemukan:', kelasList.map(k => k.nama));

  for (const k of kelasList) {
    const match = renames.find(r => k.nama === r.from || k.nama.startsWith(r.from + ' '));
    if (match) {
      await k.update({ nama: match.to });
      console.log(`Renamed: "${k.nama}" → "${match.to}"`);
    }
  }

  // Juga coba berdasarkan nama persis
  for (const rename of renames) {
    const [updated] = await seq.query(
      `UPDATE kelas SET nama = $1 WHERE sekolah_id = $2 AND (nama = $3 OR nama LIKE $4) AND nama != $1`,
      { bind: [rename.to, sd.id, rename.from, rename.from + ' %'] }
    );
    if (updated > 0) console.log(`SQL Updated: "${rename.from}" → "${rename.to}"`);
  }

  // Tampilkan hasil akhir
  const hasil = await Kelas.findAll({ where: { sekolah_id: sd.id }, order: [['nama', 'ASC']] });
  console.log('\nHasil akhir kelas SD:');
  hasil.forEach(k => console.log(' -', k.nama));

  await seq.close();
  console.log('\nDone!');
}

main().catch(e => { console.error(e); process.exit(1); });
