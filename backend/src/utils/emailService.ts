import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"Al Fakhir School" <${process.env.SMTP_USER}>`;

export const sendPaymentConfirmation = async (
  to: string,
  nama: string,
  jenisBiaya: string,
  nominal: number,
  tahunAjaran: string
) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return;
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Konfirmasi Pembayaran ${jenisBiaya} - Al Fakhir School`,
    html: `
      <h2>Konfirmasi Pembayaran</h2>
      <p>Assalamu'alaikum ${nama},</p>
      <p>Pembayaran Anda telah kami terima:</p>
      <table style="border-collapse:collapse">
        <tr><td style="padding:4px 12px"><b>Jenis</b></td><td>${jenisBiaya}</td></tr>
        <tr><td style="padding:4px 12px"><b>Nominal</b></td><td>Rp ${nominal.toLocaleString('id-ID')}</td></tr>
        <tr><td style="padding:4px 12px"><b>Tahun Ajaran</b></td><td>${tahunAjaran}</td></tr>
        <tr><td style="padding:4px 12px"><b>Status</b></td><td style="color:green"><b>LUNAS</b></td></tr>
      </table>
      <br/><p>Terima kasih atas kepercayaan Anda.</p>
      <p>Wassalamu'alaikum,<br/>Al Fakhir School</p>
    `,
  });
};


export const testEmailConnection = async (): Promise<boolean> => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
};
