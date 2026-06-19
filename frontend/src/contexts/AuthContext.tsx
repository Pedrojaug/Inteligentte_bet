import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string; cpf?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('bolao_token');
    const savedUser = localStorage.getItem('bolao_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      api.get('/api/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('bolao_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('bolao_token');
          localStorage.removeItem('bolao_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    const { user: userData, token: userToken } = res.data;
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('bolao_token', userToken);
    localStorage.setItem('bolao_user', JSON.stringify(userData));
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string; cpf?: string }) => {
    const res = await api.post('/api/auth/register', data);
    const { user: userData, token: userToken } = res.data;
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('bolao_token', userToken);
    localStorage.setItem('bolao_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('bolao_token');
    localStorage.removeItem('bolao_user');
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      localStorage.setItem('bolao_user', JSON.stringify(updated));
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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
