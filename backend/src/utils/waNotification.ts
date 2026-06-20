import logger from '../config/logger';

const WAHA_URL     = process.env.WAHA_URL     || 'http://waha:3000';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
const WAHA_API_KEY = process.env.WAHA_API_KEY || 'alfakhir-waha-2025';
const N8N_WEBHOOK  = process.env.N8N_WEBHOOK_URL || 'http://n8n:5678/webhook';
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

// Normalkan nomor HP Indonesia ke format 628xxxxxxxx
export const normalizePhone = (phone: string): string => {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0'))  p = '62' + p.slice(1);
  if (p.startsWith('+'))  p = p.slice(1);
  if (!p.startsWith('62')) p = '62' + p;
  return p;
};

const formatWaktu = (date: Date): string =>
  date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

export const sendWAMessage = async (noTelp: string, message: string): Promise<void> => {
  const phone = normalizePhone(noTelp);

  // 1. WAHA (self-hosted, gratis) — prioritas utama
  try {
    const chatId = `${phone}@c.us`;
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
      body: JSON.stringify({ chatId, text: message, session: WAHA_SESSION }),
    });
    if (res.ok) {
      logger.info({ event: 'wa_sent_waha', chatId });
      return;
    }
    const err = await res.text();
    logger.warn({ event: 'wa_waha_failed', chatId, status: res.status, err });
  } catch (e: any) {
    logger.warn({ event: 'wa_waha_error', error: e.message });
  }

  // 2. Fallback: Fonnte (jika token dikonfigurasi)
  if (FONNTE_TOKEN) {
    try {
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { Authorization: FONNTE_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: phone, message, countryCode: '62' }),
      });
      const json = await res.json() as any;
      if (json.status) { logger.info({ event: 'wa_sent_fonnte', phone }); return; }
      logger.warn({ event: 'wa_fonnte_failed', json });
    } catch (e: any) {
      logger.error({ event: 'wa_fonnte_error', error: e.message });
    }
  }

  // 3. Fallback: n8n webhook
  try {
    await fetch(`${N8N_WEBHOOK}/send-wa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message }),
    });
    logger.info({ event: 'wa_sent_n8n', phone });
  } catch (e: any) {
    logger.error({ event: 'wa_n8n_error', error: e.message });
  }
};

export const buildMasukMessage = (namaSiswa: string, namaSekolah: string, waktu: Date): string =>
  `Assalamu'alaikum 🌙\n\nKami informasikan bahwa *${namaSiswa}* telah *tiba di ${namaSekolah}* pada pukul *${formatWaktu(waktu)} WIB*.\n\nSemoga ilmunya berkah dan bermanfaat.\n\n_Tim Al Fakhir School_`;

export const buildPulangMessage = (namaSiswa: string, namaSekolah: string, waktu: Date): string =>
  `Assalamu'alaikum 🌙\n\nKami informasikan bahwa *${namaSiswa}* telah *selesai belajar di ${namaSekolah}* dan meninggalkan sekolah pada pukul *${formatWaktu(waktu)} WIB*.\n\nMohon dijemput / pastikan anak Anda tiba dengan selamat.\n\n_Tim Al Fakhir School_`;
