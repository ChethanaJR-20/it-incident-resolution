import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, LoginCredentials, RegisterCredentials } from '../types';
import { loginUser, registerUser } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  quickLogin: (role: 'EMPLOYEE' | 'ADMIN') => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const DEFAULT_EMPLOYEE: AuthUser = {
  id: '5a4543e8-efae-4564-a5bb-ed05e300d91b',
  email: 'chethanajr9@gmail.com',
  full_name: 'Chethana J R',
  department: 'Engineering',
  role: 'EMPLOYEE',
  token: 'demo_token_employee',
};

const DEFAULT_ADMIN: AuthUser = {
  id: 'e7b1a2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
  email: 'admin@enterprise.corp',
  full_name: 'Sarah Connor (IT Lead)',
  department: 'IT Infrastructure',
  role: 'ADMIN',
  token: 'demo_token_admin',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('it_agent_auth_user');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    // Default to initial Employee profile so the application is immediately usable without friction
    return DEFAULT_EMPLOYEE;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('it_agent_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('it_agent_auth_user');
    }
  }, [user]);

  const login = async (credentials: LoginCredentials) => {
    const res = await loginUser(credentials);
    const loggedUser: AuthUser = {
      ...res.user,
      token: res.access_token,
    };
    setUser(loggedUser);
    setIsAuthModalOpen(false);
  };

  const register = async (credentials: RegisterCredentials) => {
    const res = await registerUser(credentials);
    const registeredUser: AuthUser = {
      ...res.user,
      token: res.access_token,
    };
    setUser(registeredUser);
    setIsAuthModalOpen(false);
  };

  const quickLogin = async (role: 'EMPLOYEE' | 'ADMIN') => {
    if (role === 'ADMIN') {
      try {
        await login({ email: 'admin@enterprise.corp', password: 'password123' });
      } catch {
        setUser(DEFAULT_ADMIN);
        setIsAuthModalOpen(false);
      }
    } else {
      try {
        await login({ email: 'chethanajr9@gmail.com', password: 'password123' });
      } catch {
        setUser(DEFAULT_EMPLOYEE);
        setIsAuthModalOpen(false);
      }
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        quickLogin,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

