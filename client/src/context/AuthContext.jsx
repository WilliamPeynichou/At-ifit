import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [accessToken]);

  const loadUser = async () => {
    try {
      const currentToken = localStorage.getItem('accessToken');
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
        // Try to refresh token before logging out
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
          try {
            await refreshAccessToken();
            return; // Retry loadUser after refresh
          } catch (refreshError) {
            logout();
          }
        } else {
          logout();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshAccessToken = async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) {
      throw new Error('No refresh token available');
    }

    try {
      const res = await api.post('/auth/refresh', { refreshToken: refresh });
      const newAccessToken = res.data.accessToken;
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      return newAccessToken;
    } catch (error) {
      // Refresh failed, clear tokens
      logout();
      throw error;
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    
    // Check if response has the expected structure
    if (!res.data || !res.data.accessToken || !res.data.refreshToken || !res.data.user) {
      throw new Error('Invalid response format from server');
    }
    
    const { accessToken, refreshToken: refresh, user: userData } = res.data;
    
    setAccessToken(accessToken);
    setRefreshToken(refresh);
    setUser(userData);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refresh);
    
    await loadUser(); // Reload full user data
    return res.data;
  };

  const register = async (email, password, pseudo, country) => {
    try {
      const res = await api.post('/auth/register', { email, password, pseudo, country });
      
      // Check if response has the expected structure
      if (!res.data || !res.data.accessToken || !res.data.refreshToken || !res.data.user) {
        throw new Error('Invalid response format from server');
      }
      
      const { accessToken, refreshToken: refresh, user: userData } = res.data;
      
      setAccessToken(accessToken);
      setRefreshToken(refresh);
      setUser(userData);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refresh);
      
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

  const logout = async () => {
    const refresh = localStorage.getItem('refreshToken');
    
    // Try to revoke refresh token on server
    if (refresh) {
      try {
        await api.post('/auth/logout', { refreshToken: refresh });
      } catch (error) {
        console.error('Error during logout:', error);
        // Continue with logout even if server call fails
      }
    }
    
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token: accessToken, // Keep 'token' for backward compatibility
      accessToken,
      refreshToken,
      loading, 
      login, 
      register, 
      logout, 
      loadUser,
      refreshAccessToken
    }}>
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
