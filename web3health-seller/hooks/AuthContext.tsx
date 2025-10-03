import React, { useState, useMemo, useContext, createContext, ReactNode } from 'react';
import { useRouter } from 'expo-router';

interface User {
  id: string;
  name: string;
}

// Define the shape of the context data
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => void;
  logout: () => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

const router = useRouter();

// Create the provider component
export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Example: Toggle auth state for demonstration
  // In a real app, these would handle tokens, API calls, etc.
  const login = async (username: string, password: string) => {
    console.log("User logged in");
    setIsAuthenticated(true);
    setUser({ id: "1", name: username });
    return isAuthenticated;
  };
  const logout = () => {
    console.log("User logged out");
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = useMemo(() => ({ isAuthenticated, user, login, logout }), [isAuthenticated, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Create the hook for easy consumption
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};