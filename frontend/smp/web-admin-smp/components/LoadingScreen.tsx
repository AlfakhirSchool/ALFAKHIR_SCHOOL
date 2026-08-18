import SharedLoadingScreen from '@shared/components/LoadingScreen';
export default function LoadingScreen({ show }: { show: boolean }) {
  return <SharedLoadingScreen show={show} title="Admin Dashboard" />;
}
