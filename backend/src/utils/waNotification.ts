import logger from '../config/logger';

const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook';
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

// Normalkan nomor HP Indonesia ke format 628xxxxxxxx
export const normalizePhone = (phone: string): string => {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  if (p.startsWith('+')) p = p.slice(1);
  if (!p.startsWith('62')) p = '62' + p;
  return p;
};

const formatWaktu = (date: Date): string =>
  date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

export const sendWAMessage = async (noTelp: string, message: string): Promise<void> => {
  const target = normalizePhone(noTelp);

  // 1. Fonnte (jika dikonfigurasi)
  if (FONNTE_TOKEN) {
    try {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { Authorization: FONNTE_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, message, countryCode: '62' }),
      });
      const json = await res.json() as any;
      if (json.status) { logger.info({ event: 'wa_sent_fonnte', target }); return; }
      logger.warn({ event: 'wa_fonnte_failed', target, json });
    } catch (e: any) {
      logger.error({ event: 'wa_fonnte_error', error: e.message });
    }
  }

  // 2. Fallback: n8n webhook
  try {
    await fetch(`${N8N_WEBHOOK}/send-wa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, message }),
    });
    logger.info({ event: 'wa_sent_n8n', target });
  } catch (e: any) {
    logger.error({ event: 'wa_n8n_error', error: e.message });
  }
};

export const buildMasukMessage = (namaSiswa: string, namaSekolah: string, waktu: Date): string =>
  `Assalamu'alaikum 🌙\n\nKami informasikan bahwa *${namaSiswa}* telah *tiba di ${namaSekolah}* pada pukul *${formatWaktu(waktu)} WIB*.\n\nSemoga ilmunya berkah dan bermanfaat.\n\n_Tim Al Fakhir School_`;

export const buildPulangMessage = (namaSiswa: string, namaSekolah: string, waktu: Date): string =>
  `Assalamu'alaikum 🌙\n\nKami informasikan bahwa *${namaSiswa}* telah *selesai belajar di ${namaSekolah}* dan meninggalkan sekolah pada pukul *${formatWaktu(waktu)} WIB*.\n\nMohon dijemput / pastikan anak Anda tiba dengan selamat.\n\n_Tim Al Fakhir School_`;
