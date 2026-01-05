import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => {
    const token = localStorage.getItem('accessToken');
    return token || null;
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    const token = localStorage.getItem('refreshToken');
    return token || null;
  });
  const [loading, setLoading] = useState(true);
  const [loadUserAttempts, setLoadUserAttempts] = useState(0);

  useEffect(() => {
    let mounted = true;
    let isInitializing = true;
    
    const initLoad = async () => {
      if (!isInitializing) return;
      isInitializing = false;
      
      if (accessToken) {
        await loadUser();
      } else {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initLoad();
    
    // Écouter les changements du localStorage (quand l'intercepteur supprime les tokens)
    const handleStorageChange = () => {
      const currentToken = localStorage.getItem('accessToken');
      if (!currentToken && accessToken) {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
        setLoading(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Timeout de sécurité pour éviter le blocage infini
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('AuthContext: Loading timeout, forcing loading to false');
        setLoading(false);
      }
    }, 10000);
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [accessToken]);

  const loadUser = async () => {
    // Prévenir les boucles infinies
    if (loadUserAttempts >= 3) {
      console.error('Too many loadUser attempts, stopping');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setLoadUserAttempts(prev => prev + 1);
      
      const currentToken = localStorage.getItem('accessToken');
      if (!currentToken) {
        setLoading(false);
        setLoadUserAttempts(0);
        return;
      }
      
      const res = await Promise.race([
        api.get('/auth/me'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout after 5s')), 5000))
      ]);
      
      if (res.data) {
        setUser(res.data);
        setLoadUserAttempts(0);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      
      if (error.response?.status === 401) {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh && loadUserAttempts < 2) {
          try {
            await refreshAccessToken();
            const retryRes = await api.get('/auth/me');
            if (retryRes.data) {
              setUser(retryRes.data);
              setLoadUserAttempts(0);
            }
          } catch (refreshError) {
            console.error('Refresh token failed:', refreshError);
            setLoadUserAttempts(0);
            logout();
            return;
          }
        } else {
          setLoadUserAttempts(0);
          logout();
          return;
        }
      } else if (!error.response || error.message?.includes('timeout')) {
        const refresh = localStorage.getItem('refreshToken');
        if (!refresh) {
          logout();
        } else {
          console.error('Network error loading user:', error);
          setLoading(false);
          setLoadUserAttempts(0);
        }
        return;
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
      logout();
      throw error;
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    
    if (!res.data || !res.data.accessToken || !res.data.refreshToken || !res.data.user) {
      throw new Error('Invalid response format from server');
    }
    
    const { accessToken, refreshToken: refresh, user: userData } = res.data;
    
    setAccessToken(accessToken);
    setRefreshToken(refresh);
    setUser(userData);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refresh);
    
    await loadUser();
    return res.data;
  };

  const register = async (email, password, pseudo, country) => {
    try {
      const res = await api.post('/auth/register', { email, password, pseudo, country });
      
      if (!res.data || !res.data.accessToken || !res.data.refreshToken || !res.data.user) {
        throw new Error('Invalid response format from server');
      }
      
      const { accessToken, refreshToken: refresh, user: userData } = res.data;
      
      setAccessToken(accessToken);
      setRefreshToken(refresh);
      setUser(userData);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refresh);
      
      try {
        await loadUser();
      } catch (loadError) {
        console.warn('Could not reload user after registration, but registration succeeded', loadError);
      }
      
      return res.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('refreshToken');
    
    if (refresh) {
      try {
        await api.post('/auth/logout', { refreshToken: refresh });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }
    
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setLoading(false);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token: accessToken,
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
