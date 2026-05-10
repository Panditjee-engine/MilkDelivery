import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import LoadingScreen from '../src/components/LoadingScreen';
import { Colors } from '../src/constants/colors';
import { api } from '../src/services/api';

export default function Index() {
  const { user, isWorker, loading } = useAuth();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Seed initial data
      try {
        setSeeding(true);
        //  await api.seedData();
      } catch (error) {
        console.log('Seed skipped or failed:', error);
      } finally {
        setSeeding(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (!loading && !seeding) {
      if (isWorker) {
      router.replace('/(worker)' as any);
      return;
    }
      if (user) {
        // Redirect based on role
        switch (user.role) {
          case 'customer':
            router.replace('/(customer)/home');
            break;
          case 'delivery_partner':
            router.replace('/(delivery)/home');
            break;
          case 'admin':
            router.replace('/(admin)/dashboard');
            break;
          default:
            router.replace('/(auth)/login');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, isWorker, loading, seeding]);

  if (loading || seeding) {
    return <LoadingScreen message={seeding ? 'Setting up...' : 'Loading...'} />;
  }

  return (
   <View style={styles.container}>
  <View style={styles.logoContainer}>
    <View style={styles.logoCircle}>
      <Image
        source={require('../assets/images/GawSatva.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
    <Text style={styles.title}>Gau<Text style={styles.titleItalic}>satv</Text></Text>
    <Text style={styles.subtitle}>Cow Farm Management</Text>
  </View>
</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
 logoCircle: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: '#F5C97A',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 20,
},
logoImage: {
  width: 70,
  height: 70,
},
  logoEmoji: {
    fontSize: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.textInverse,
    marginBottom: 8,
  },
  titleItalic: {
    fontStyle: 'italic',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textInverse,
    opacity: 0.9,
  },
});
