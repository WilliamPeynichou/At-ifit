import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        setLoading(false);
        return;
      }
      
      const res = await api.get('/auth/me');
      if (res.data) {
        setUser(res.data);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      // Only logout if it's an auth error, not a network error
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    await loadUser(); // Reload full user data
    return res.data;
  };

  const register = async (email, password, pseudo, country) => {
    try {
      const res = await api.post('/auth/register', { email, password, pseudo, country });
      
      // Check if response has the expected structure
      if (!res.data || !res.data.token || !res.data.user) {
        throw new Error('Invalid response format from server');
      }
      
      const token = res.data.token;
      const user = res.data.user;
      
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      
      // Reload full user data after setting token
      try {
        await loadUser();
      } catch (loadError) {
        console.warn('Could not reload user after registration, but registration succeeded', loadError);
        // Don't fail registration if loadUser fails
      }
      
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      // Re-throw to let the component handle it
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
