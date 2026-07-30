/**
 * Migrate data dari observasi Neon DB ke alfakhirchool PostgreSQL
 * Run: npx ts-node src/scripts/migrate-observasi.ts
 */
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const SOURCE = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_mC4i5sbklFHx@ep-weathered-bread-a4yj9jbi-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

const TARGET = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'alfakhir_school',
  user: process.env.DB_USER || 'alfakhir',
  password: process.env.DB_PASSWORD || 'alfakhir_dev_2025',
});

function mapStatus(s: string): string {
  if (s === 'COMPLETED') return 'DITERIMA';
  if (s === 'PENDING') return 'PENDING';
  return 'REVIEW'; // RESPONSE_RECEIVED, REVIEWED
}

async function run() {
  console.log('Connecting...');
  await SOURCE.query('SELECT 1');
  await TARGET.query('SELECT 1');
  console.log('Connected to both DBs');

  // 1. Kandidat
  const { rows: candidates } = await SOURCE.query(`
    SELECT id, name, "correctedName", level, status,
           "parentEmail", "parentPhone", "academicYear",
           "studentEmail", room, "createdAt"
    FROM "Candidate" ORDER BY "createdAt"
  `);

  // Map old_id -> new_uuid
  const idMap: Record<string, string> = {};
  let inserted = 0;

  for (const c of candidates) {
    const newId = uuidv4();
    idMap[c.id] = newId;
    const nama = c.correctedName || c.name;
    const status = mapStatus(c.status);
    const tahun = c.academicYear || '2026/2027';

    await TARGET.query(`
      INSERT INTO kandidat (id, nama, nama_diperbaiki, level, status, tahun_ajaran,
        email_ortu, no_telp_ortu, email_siswa, ruangan, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
      ON CONFLICT (id) DO NOTHING
    `, [newId, c.name, nama !== c.name ? nama : null, c.level, status, tahun,
        c.parentEmail || null, c.parentPhone || null, c.studentEmail || null,
        c.room || null, c.createdAt]);
    inserted++;
  }
  console.log(`✓ ${inserted} kandidat migrated`);

  // 2. Catatan Pewawancara
  const { rows: notes } = await SOURCE.query(`SELECT * FROM "InterviewerNote"`);
  let notesInserted = 0;
  for (const n of notes) {
    const kandidatId = idMap[n.candidateId];
    if (!kandidatId) continue;
    await TARGET.query(`
      INSERT INTO catatan_pewawancara (id, kandidat_id, pewawancara_email, pewawancara_nama,
        observasi, penilaian_akademik, dukungan_keluarga, catatan_karakter, catatan_lain,
        rekomendasi, is_locked, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
      ON CONFLICT (id) DO NOTHING
    `, [uuidv4(), kandidatId, n.interviewerEmail || null, n.interviewerName || null,
        n.observation || null, n.academicAssessment || null, n.familySupport || null,
        n.characterNotes || null, n.otherNotes || null, n.recommendation || null,
        n.isLocked, n.createdAt]);
    notesInserted++;
  }
  console.log(`✓ ${notesInserted} catatan pewawancara migrated`);

  // 3. Soal Akademik
  const { rows: questions } = await SOURCE.query(`SELECT * FROM "AcademicQuestion" ORDER BY "order"`);
  const soalIdMap: Record<string, string> = {};
  let soalInserted = 0;
  for (const q of questions) {
    const newId = uuidv4();
    soalIdMap[q.id] = newId;
    await TARGET.query(`
      INSERT INTO soal_akademik (id, teks, mata_pelajaran, gambar_url, pilihan, jawaban_benar, urutan, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      ON CONFLICT (id) DO NOTHING
    `, [newId, q.text, q.subject, q.imageUrl || null, q.options, q.correctAnswer, q.order || 0]);
    soalInserted++;
  }
  console.log(`✓ ${soalInserted} soal akademik migrated`);

  // 4. Hasil Tes Akademik
  const { rows: results } = await SOURCE.query(`SELECT * FROM "AcademicTestResult"`);
  let hasilInserted = 0;
  for (const r of results) {
    const kandidatId = idMap[r.candidateId];
    if (!kandidatId) continue;
    await TARGET.query(`
      INSERT INTO hasil_tes_akademik (id, kandidat_id, total_skor, skor_per_mapel, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$5)
      ON CONFLICT (kandidat_id) DO NOTHING
    `, [uuidv4(), kandidatId, r.totalScore, r.subjectScores, r.createdAt]);
    // Update skor_akademik di kandidat
    await TARGET.query(`UPDATE kandidat SET skor_akademik=$1 WHERE id=$2`, [r.totalScore, kandidatId]);
    hasilInserted++;
  }
  console.log(`✓ ${hasilInserted} hasil tes akademik migrated`);

  // 5. Jawaban Akademik
  const { rows: responses } = await SOURCE.query(`SELECT * FROM "AcademicResponse"`);
  let jawInserted = 0;
  for (const r of responses) {
    const kandidatId = idMap[r.candidateId];
    const soalId = soalIdMap[r.questionId];
    if (!kandidatId || !soalId) continue;
    await TARGET.query(`
      INSERT INTO jawaban_akademik (id, kandidat_id, soal_id, jawaban, benar, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
      ON CONFLICT (kandidat_id, soal_id) DO NOTHING
    `, [uuidv4(), kandidatId, soalId, r.answer, r.isCorrect]);
    jawInserted++;
  }
  console.log(`✓ ${jawInserted} jawaban akademik migrated`);

  // 6. Ringkasan AI
  const { rows: summaries } = await SOURCE.query(`SELECT * FROM "AiSummary"`);
  let aiInserted = 0;
  for (const s of summaries) {
    const kandidatId = idMap[s.candidateId];
    if (!kandidatId) continue;
    await TARGET.query(`
      INSERT INTO ringkasan_ai (id, kandidat_id, ringkasan, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$4)
      ON CONFLICT (kandidat_id) DO NOTHING
    `, [uuidv4(), kandidatId, s.summary, s.createdAt]);
    aiInserted++;
  }
  console.log(`✓ ${aiInserted} ringkasan AI migrated`);

  console.log('\n✅ Migrasi selesai!');
  await SOURCE.end();
  await TARGET.end();
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
