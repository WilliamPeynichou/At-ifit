import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
});

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    // #region agent log
    if (response.config?.url?.includes('/auth/me')) {
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:36',message:'Interceptor: /auth/me response success',data:{status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6'})}).catch(()=>{});
    }
    // #endregion
    return response;
  },
  async (error) => {
    // #region agent log
    if (error.config?.url?.includes('/auth/me')) {
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:42',message:'Interceptor: /auth/me error caught',data:{hasResponse:!!error.response,status:error.response?.status,message:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6,H8'})}).catch(()=>{});
    }
    // #endregion
    const originalRequest = error.config;

    if (!error.response) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:46',message:'Interceptor: network error, rejecting',data:{message:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      console.error('Network Error:', error.message);
      console.error('Make sure the backend server is running on http://localhost:3001');
      return Promise.reject(error);
    }
    
    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:52',message:'Interceptor: 401 error, attempting refresh',data:{isRefreshing,hasRefreshToken:!!localStorage.getItem('refreshToken')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:68',message:'Interceptor: no refresh token, redirecting to login',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Déclencher un événement pour notifier AuthContext de la suppression des tokens
        window.dispatchEvent(new Event('storage'));
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:98',message:'Interceptor: calling /auth/refresh',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        const response = await Promise.race([
          api.post('/auth/refresh', { refreshToken }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Refresh timeout after 5s')), 5000))
        ]);
        const { accessToken } = response.data;
        
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:105',message:'Interceptor: refresh success',data:{hasAccessToken:!!accessToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        localStorage.setItem('accessToken', accessToken);
        processQueue(null, accessToken);
        isRefreshing = false;
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.js:114',message:'Interceptor: refresh failed',data:{message:refreshError.message,isTimeout:refreshError.message?.includes('timeout')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        processQueue(refreshError, null);
        isRefreshing = false;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Déclencher un événement pour notifier AuthContext de la suppression des tokens
        window.dispatchEvent(new Event('storage'));
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
