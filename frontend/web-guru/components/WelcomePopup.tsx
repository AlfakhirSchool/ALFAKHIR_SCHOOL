import SharedWelcomePopup from '@shared/components/WelcomePopup';
export default function WelcomePopup({ nama }: { nama: string }) {
  return <SharedWelcomePopup nama={nama} accent="#1B8B87" subtitle="Selamat datang di Al Fakhir School" />;
}
