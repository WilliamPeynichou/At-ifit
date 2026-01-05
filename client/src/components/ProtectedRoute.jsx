import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Onboarding from './Onboarding';

const ProtectedRoute = ({ children }) => {
  const { token, accessToken, loading, user } = useAuth();
  const effectiveToken = accessToken || token; // Support both old and new token names
  const location = useLocation();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:13',message:'ProtectedRoute useEffect',data:{loading,hasToken:!!token,hasUser:!!user,effectiveToken:!!effectiveToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H5'})}).catch(()=>{});
    // #endregion
    if (!loading && token && user) {
      // Check if onboarding was already completed
      const onboardingCompleted = localStorage.getItem('onboarding_completed');
      
      if (onboardingCompleted === 'true') {
        setNeedsOnboarding(false);
      } else {
        // Check if profile is incomplete or Strava not connected
        const profileIncomplete = !user.height || !user.age || !user.gender;
        const stravaNotConnected = !user.stravaAccessToken;
        
        setNeedsOnboarding(profileIncomplete || stravaNotConnected);
      }
      setCheckingOnboarding(false);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:27',message:'ProtectedRoute: set checkingOnboarding false (has token and user)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    } else if (!loading) {
      // If loading is false, stop checking regardless of token/user state
      setCheckingOnboarding(false);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:30',message:'ProtectedRoute: set checkingOnboarding false (loading false)',data:{hasToken:!!token,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    }
  }, [loading, token, user]);

  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:34',message:'ProtectedRoute render check',data:{loading,checkingOnboarding,hasEffectiveToken:!!effectiveToken,effectiveTokenValue:effectiveToken?effectiveToken.substring(0,20)+'...':null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2,H5'})}).catch(()=>{});
  }
  // #endregion
  
  if (loading || checkingOnboarding) {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:42',message:'ProtectedRoute: showing loading',data:{loading,checkingOnboarding},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H2'})}).catch(()=>{});
    }
    // #endregion
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  // Vérifier directement le localStorage pour éviter les problèmes de synchronisation du state
  const hasTokenInStorage = typeof window !== 'undefined' && localStorage.getItem('accessToken');
  
  // Si loading est false mais qu'il n'y a pas de token OU pas d'utilisateur après un délai raisonnable, rediriger vers login
  if ((!effectiveToken || !hasTokenInStorage) || (!user && !loading && !hasTokenInStorage)) {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7243/ingest/d858c3db-32e3-44df-94d2-2503e3d0c905',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:50',message:'ProtectedRoute: redirecting to login (no token or no user)',data:{effectiveToken:!!effectiveToken,hasTokenInStorage:!!hasTokenInStorage,hasUser:!!user,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'H5'})}).catch(()=>{});
    }
    // #endregion
    return <Navigate to="/login" replace />;
  }

  // Don't show onboarding on onboarding-related routes or new user setup routes
  if (
    location.pathname === '/strava-connect' || 
    location.pathname === '/onboarding' ||
    location.pathname === '/new-user-profile' ||
    location.pathname === '/new-user-weight' ||
    location.pathname === '/new-user-strava'
  ) {
    return children;
  }

  // Show onboarding if needed (only for existing users, not new registrations)
  if (needsOnboarding) {
    return <Onboarding />;
  }

  return children;
};

export default ProtectedRoute;
