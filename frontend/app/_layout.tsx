import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/contexts/AuthContext';
import { Colors } from '../src/constants/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useVersionCheck } from '../src/services/useVersionCheck';
import UpdateModal from '../src/components/UpdateModal';
import * as Linking from 'expo-linking';        // ← ADD
import { useRouter } from 'expo-router';         // ← ADD
import { useEffect } from 'react';               // ← ADD

function AppContent() {
  const { versionInfo } = useVersionCheck();
  const router = useRouter();                    // ← ADD

  // ── Deep Link Handler ──────────────────────  // ← ADD
  const handleDeepLink = (url: string) => {
    const parsed = Linking.parse(url);
    if (parsed.path === 'register' && parsed.queryParams?.referral_code) {
      router.push({
        pathname: '/register',
        params: { referral_code: parsed.queryParams.referral_code as string },
      });
    }
  };

  useEffect(() => {                              // ← ADD
    // App open ho aur link aaye
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });
    // App band thi, link se khuli
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });
    return () => subscription.remove();
  }, []);
  // ───────────────────────────────────────────

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