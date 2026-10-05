import { Redirect } from 'expo-router';
import { useAppStore } from '@/features/app-state/useAppStore';
import {FullScreenLoader} from '@/shared/components/FullScreenLoader';

export default function EntryScreen() {
  const hydrated = useAppStore((state) => state.hydrated);
  const restoring = useAppStore((state) => state.isRestoringSession);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const profile = useAppStore((state) => state.profile);

  if (!hydrated || restoring || connectionStatus === 'idle') return <FullScreenLoader />;

  return <Redirect href={profile ? '/(tabs)' : '/onboarding'} />;
}
