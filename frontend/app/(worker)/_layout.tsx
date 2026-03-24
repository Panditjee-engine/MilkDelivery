import { Stack } from "expo-router";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";

export default function WorkerLayout() {
  const { isWorker, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isWorker) {
      router.replace("/(auth)/login" as any);
    }
  }, [isWorker, loading]);

  if (loading || !isWorker) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}