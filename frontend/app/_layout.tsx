import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { Colors } from '../src/constants/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVersionCheck } from '../src/services/useVersionCheck';
import UpdateModal from '../src/components/UpdateModal';

function AppContent() {
  const { versionInfo } = useVersionCheck();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      />
      {versionInfo?.updateAvailable && <UpdateModal versionInfo={versionInfo} />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}