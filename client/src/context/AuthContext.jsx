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
    const effectId = Math.random().toString(36).substring(7);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:19',message:'useEffect init',data:{accessToken:!!accessToken,hasAccessToken:!!localStorage.getItem('accessToken'),effectId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H7'})}).catch(()=>{});
    // #endregion
    
    const initLoad = async () => {
      // Prévenir les appels multiples simultanés
      if (!isInitializing) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:26',message:'initLoad: already initializing, skipping',data:{effectId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
        return;
      }
      isInitializing = false;
      
      if (accessToken) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:31',message:'initLoad: has accessToken, calling loadUser',data:{accessToken:accessToken.substring(0,20)+'...',effectId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        await loadUser();
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:35',message:'initLoad: no accessToken, setting loading false',data:{mounted,effectId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        if (mounted) {
          setLoading(false);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:38',message:'initLoad: loading set to false',data:{effectId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
        }
      }
    };
    
    initLoad();
    
    // Écouter les changements du localStorage (quand l'intercepteur supprime les tokens)
    const handleStorageChange = () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:48',message:'Storage event detected, checking tokens',data:{hasAccessToken:!!localStorage.getItem('accessToken'),hasRefreshToken:!!localStorage.getItem('refreshToken')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H7'})}).catch(()=>{});
      // #endregion
      const currentToken = localStorage.getItem('accessToken');
      if (!currentToken && accessToken) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:51',message:'Storage event: tokens removed, updating state',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:63',message:'Timeout triggered, forcing loading false',data:{effectId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        console.warn('AuthContext: Loading timeout, forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 secondes max
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [accessToken]);

  const loadUser = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:48',message:'loadUser called',data:{loadUserAttempts,hasToken:!!localStorage.getItem('accessToken')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    
    // Prévenir les boucles infinies
    if (loadUserAttempts >= 3) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:51',message:'loadUser: too many attempts, stopping',data:{loadUserAttempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      console.error('Too many loadUser attempts, stopping');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setLoadUserAttempts(prev => prev + 1);
      
      const currentToken = localStorage.getItem('accessToken');
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:60',message:'loadUser: checking token',data:{hasCurrentToken:!!currentToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      if (!currentToken) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:62',message:'loadUser: no token, setting loading false and returning',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        setLoading(false);
        setLoadUserAttempts(0);
        return;
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:67',message:'loadUser: calling /auth/me',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6,H8'})}).catch(()=>{});
      // #endregion
      let res;
      try {
        res = await Promise.race([
          api.get('/auth/me'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout after 5s')), 5000))
        ]);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:72',message:'loadUser: /auth/me success',data:{hasData:!!res.data,status:res.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6,H8'})}).catch(()=>{});
        // #endregion
      } catch (raceError) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:75',message:'loadUser: /auth/me race error',data:{message:raceError.message,isTimeout:raceError.message.includes('timeout')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6,H8'})}).catch(()=>{});
        // #endregion
        throw raceError;
      }
      if (res.data) {
        setUser(res.data);
        setLoadUserAttempts(0); // Reset on success
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:73',message:'loadUser: error caught',data:{status:error.response?.status,hasResponse:!!error.response,message:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3,H4'})}).catch(()=>{});
      // #endregion
      console.error('Error loading user:', error);
      // Only logout if it's an auth error, not a network error
      if (error.response?.status === 401) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:76',message:'loadUser: 401 error, attempting refresh',data:{hasRefreshToken:!!localStorage.getItem('refreshToken'),loadUserAttempts},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        // Try to refresh token before logging out
        const refresh = localStorage.getItem('refreshToken');
        if (refresh && loadUserAttempts < 2) {
          try {
            await refreshAccessToken();
            // Retry loadUser after refresh (will increment attempts)
            const retryRes = await api.get('/auth/me');
            if (retryRes.data) {
              setUser(retryRes.data);
              setLoadUserAttempts(0);
            }
          } catch (refreshError) {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:87',message:'loadUser: refresh failed, calling logout',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
            console.error('Refresh token failed:', refreshError);
            setLoadUserAttempts(0);
            logout();
            return; // logout() already sets loading to false
          }
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:95',message:'loadUser: no refresh token or too many attempts, calling logout',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          setLoadUserAttempts(0);
          logout();
          return; // logout() already sets loading to false
        }
      } else if (!error.response || error.message?.includes('timeout')) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:99',message:'loadUser: network/timeout error, checking if should logout',data:{message:error.message,hasRefreshToken:!!localStorage.getItem('refreshToken')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        // Network error or timeout - if we have a refresh token, the interceptor should handle it
        // If not, or if refresh also fails, logout
        const refresh = localStorage.getItem('refreshToken');
        if (!refresh) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:105',message:'loadUser: no refresh token, calling logout',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          logout();
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:108',message:'loadUser: network error but has refresh token, setting loading false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
          console.error('Network error loading user:', error);
          setLoading(false);
          setLoadUserAttempts(0);
        }
        return;
      }
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:106',message:'loadUser: finally block, setting loading false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:182',message:'logout called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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
    setLoading(false);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.jsx:198',message:'logout: cleared tokens and set loading false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
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
