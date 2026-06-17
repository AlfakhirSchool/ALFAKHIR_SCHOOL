/**
 * Reset passwords for all siswa and their ortu to last 4 digits of NIS.
 * Run: npx ts-node src/scripts/reset-passwords-nis.ts
 */
import bcrypt from 'bcrypt';
import sequelize from '../config/database';
import { User, Siswa, OrangTua } from '../models';

async function main() {
  await sequelize.authenticate();
  console.log('DB connected');

  const siswaList = await Siswa.findAll({
    include: [
      { model: User, as: 'user' },
      { model: OrangTua, as: 'orang_tua_list', include: [{ model: User, as: 'user' }] },
    ],
  });

  let siswaUpdated = 0;
  let ortuUpdated = 0;

  for (const siswa of siswaList) {
    const nis = (siswa as any).nis as string | null;
    if (!nis || nis.length < 4) {
      console.warn(`Skip siswa ${siswa.id}: NIS tidak valid (${nis})`);
      continue;
    }

    const last4 = nis.slice(-4);
    const hash = await bcrypt.hash(last4, 12);

    // Update siswa user password
    const siswaUser = (siswa as any).user as InstanceType<typeof User>;
    if (siswaUser) {
      await siswaUser.update({ password_hash: hash });
      console.log(`Siswa [${nis}] ${siswaUser.nama} → password: ${last4}`);
      siswaUpdated++;
    }

    // Update all ortu linked to this siswa (same password = last 4 of child's NIS)
    const ortuList = (siswa as any).orang_tua_list as any[];
    for (const ortu of ortuList || []) {
      const ortuUser = ortu.user as InstanceType<typeof User>;
      if (ortuUser) {
        await ortuUser.update({ password_hash: hash });
        console.log(`  Ortu [${ortu.hubungan}] ${ortuUser.nama} → password: ${last4}`);
        ortuUpdated++;
      }
    }
  }

  console.log(`\nSelesai: ${siswaUpdated} siswa, ${ortuUpdated} ortu diupdate.`);
  await sequelize.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
