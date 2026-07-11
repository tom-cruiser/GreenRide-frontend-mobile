import React, { createContext, useCallback, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, walletAPI } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emergencyContact?: string;
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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateWalletBalance = useCallback(async () => {
    if (!token) return;
    try {
      const response = await walletAPI.getBalance(token);
      if (response.wallet) {
        const total = response.wallet.available + response.wallet.bonus;
        setWalletBalance(total);
      }
    } catch (error) {
      // Silently fail — don't block the app UI if wallet fetch times out
      console.warn('Failed to update wallet balance:', error);
    }
  }, [token]);

  // Load stored auth data on app start
  useEffect(() => {
    loadStoredAuthData();
  }, []);

  // Update wallet balance when user changes
  useEffect(() => {
    if (user && token) {
      updateWalletBalance();
    }
  }, [user, token, updateWalletBalance]);

  const loadStoredAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('userData');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load stored auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login({ email, password });
      
      if (response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
        
        // Store auth data
        await AsyncStorage.setItem('authToken', response.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; password: string }) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      if (response.user) {
        // Auto-login after registration
        await login(userData.email, userData.password);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      setWalletBalance(0);
      
      // Clear stored auth data
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!user || !token) return;
    try {
      const response = await authAPI.updateProfile(token, { name: userData.name, phone: userData.phone });
      const updatedUser = { ...user, ...response.user };
      setUser(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    walletBalance,
    isLoading,
    login,
    register,
    logout,
    updateWalletBalance,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};