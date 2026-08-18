import SharedWelcomePopup from '@shared/components/WelcomePopup';
export default function WelcomePopup({ nama }: { nama: string }) {
  return <SharedWelcomePopup nama={nama} accent="#3B7FD1" subtitle="Selamat datang di Admin Dashboard" />;
}
