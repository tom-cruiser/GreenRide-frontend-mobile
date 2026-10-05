import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { authAPI, setUnauthorizedHandler, walletAPI } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  walletBalance: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateWalletBalance: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const updateWalletBalance = useCallback(async () => {
    if (!token) return;
    try {
      const response = await walletAPI.getBalance(token);
      if (response.wallet) {
        setWalletBalance((response.wallet.available ?? 0) + (response.wallet.bonus ?? 0));
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('driverAuthToken');
        const storedUser = await AsyncStorage.getItem('driverUserData');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {}
      finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (user && token) updateWalletBalance();
  }, [user, token, updateWalletBalance]);

  // isLoading only covers restoring the saved session at startup; the auth
  // screens show their own progress, so the navigator stays mounted.
  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    if (!response.user || !response.token) throw new Error('Invalid response from server');
    if (response.user.role !== 'driver') {
      throw new Error('This is not a driver account. Use the GreenRide rider app instead.');
    }
    setUser(response.user);
    setToken(response.token);
    await AsyncStorage.setItem('driverAuthToken', response.token);
    await AsyncStorage.setItem('driverUserData', JSON.stringify(response.user));
  };

  const register = async (userData: { name: string; email: string; password: string }) => {
    const response = await authAPI.register(userData);
    if (!response.user) throw new Error('Registration failed');
    await login(userData.email, userData.password);
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setWalletBalance(0);
    await AsyncStorage.multiRemove(['driverAuthToken', 'driverUserData']);
  };

  // An expired or invalid login (any authenticated request answered 401):
  // sign out once; the route guard then shows the login screen.
  const logoutRef = useRef(logout);
  const sessionExpired = useRef(false);
  useEffect(() => {
    logoutRef.current = logout;
  });
  useEffect(() => {
    if (token) sessionExpired.current = false;
  }, [token]);
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (sessionExpired.current) return;
      sessionExpired.current = true;
      logoutRef.current();
      Alert.alert('Session expired', 'Please sign in again.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const updateProfile = async (userData: Partial<User>) => {
    if (!user || !token) return;
    const response = await authAPI.updateProfile(token, { name: userData.name, phone: userData.phone });
    const updatedUser = { ...user, ...response.user };
    setUser(updatedUser);
    await AsyncStorage.setItem('driverUserData', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, walletBalance, isLoading, login, register, logout, updateWalletBalance, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
