import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import LoadingScreen from '../src/components/LoadingScreen';
import { Colors } from '../src/constants/colors';
import { api } from '../src/services/api';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      // Seed initial data
      try {
        setSeeding(true);
         await api.seedData();
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
  }, [user, loading, seeding]);

  if (loading || seeding) {
    return <LoadingScreen message={seeding ? 'Setting up...' : 'Loading...'} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🥛</Text>
        </View>
        <Text style={styles.title}>FreshMilk</Text>
        <Text style={styles.subtitle}>Daily Essentials Delivered</Text>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  subtitle: {
    fontSize: 16,
    color: Colors.textInverse,
    opacity: 0.9,
  },
});
