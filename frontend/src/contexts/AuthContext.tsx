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

interface AuthContextType {
  user: User | null;
  token: string | null;   
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await api.init();
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
    } catch (error) {
      console.log('Auth check failed:', error);
      setUser(null);
      setToken(null);                   
      await AsyncStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setToken(response.access_token);    
    setUser(response.user);
  };

  const register = async (data: any) => {
    const response = await api.register(data);
    setToken(response.access_token);    
    setUser(response.user);
  };

  const logout = async () => {
    console.log('LOGOUT FUNCTION CALLED');
    await api.logout();
    setToken(null);                    
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
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