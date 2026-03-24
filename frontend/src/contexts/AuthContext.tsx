import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'customer' | 'delivery_partner' | 'admin';
  address?: any;
  is_active: boolean;
  zone?: string;
}

interface Worker {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'worker';
  farm_name?: string;
  designation?: string;
  is_active: boolean;
  is_verified: boolean;
  admin_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  worker: Worker | null;
  workerToken: string | null;
  isWorker: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  workerLogin: (email: string, password: string) => Promise<void>;
  workerLogout: () => Promise<void>;  // ← add this
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [token,       setToken]       = useState<string | null>(null);
  const [worker,      setWorker]      = useState<Worker | null>(null);
  const [workerToken, setWorkerToken] = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);

  // Derived flag — true when a worker session is active
  const isWorker = worker !== null;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await api.init();

      // ── Check regular user session ──────────────────────────────
      const storedToken = await AsyncStorage.getItem('access_token');
      if (storedToken) {
        setToken(storedToken);
        api.setToken(storedToken);
        const userData = await api.getMe();
        setUser(userData);
      } else {
        setToken(null);
        setUser(null);
      }

      // ── Check worker session ────────────────────────────────────
      const storedWorkerToken = await AsyncStorage.getItem('worker_token');
      const storedWorkerData  = await AsyncStorage.getItem('worker_data');
      if (storedWorkerToken && storedWorkerData) {
        setWorkerToken(storedWorkerToken);
        setWorker(JSON.parse(storedWorkerData));
      } else {
        setWorkerToken(null);
        setWorker(null);
      }

    } catch (error) {
      console.log('Auth check failed:', error);
      setUser(null);
      setToken(null);
      setWorker(null);
      setWorkerToken(null);
      await AsyncStorage.multiRemove(['access_token', 'worker_token', 'worker_data']);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    await AsyncStorage.setItem('access_token', response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  };

 const workerLogin = async (identifier: string, password: string) => {
  const data = await api.workerLogin(identifier, password);
  setWorkerToken(data.access_token);
  setWorker(data.worker);
};

const workerLogout = async () => {
  await api.workerLogout();
  setWorkerToken(null);
  setWorker(null);
};

  const register = async (data: any) => {
    const response = await api.register(data);
    await AsyncStorage.setItem('access_token', response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  };

  const logout = async () => {
    console.log('LOGOUT FUNCTION CALLED');

    // Clear both sessions on logout
    await api.logout();
    await AsyncStorage.multiRemove(['access_token', 'worker_token', 'worker_data']);

    setToken(null);
    setUser(null);
    setWorkerToken(null);
    setWorker(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        worker,
        workerToken,
        isWorker,
        loading,
        workerLogout,
        login,
        workerLogin,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}