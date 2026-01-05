import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Onboarding from './Onboarding';

const ProtectedRoute = ({ children }) => {
  const { token, accessToken, loading, user } = useAuth();
  const effectiveToken = accessToken || token;
  const location = useLocation();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!loading && token && user) {
      const onboardingCompleted = localStorage.getItem('onboarding_completed');
      
      if (onboardingCompleted === 'true') {
        setNeedsOnboarding(false);
      } else {
        const profileIncomplete = !user.height || !user.age || !user.gender;
        const stravaNotConnected = !user.stravaAccessToken;
        setNeedsOnboarding(profileIncomplete || stravaNotConnected);
      }
      setCheckingOnboarding(false);
    } else if (!loading) {
      setCheckingOnboarding(false);
    }
  }, [loading, token, user]);

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  const hasTokenInStorage = typeof window !== 'undefined' && localStorage.getItem('accessToken');
  
  if ((!effectiveToken || !hasTokenInStorage) || (!user && !loading && !hasTokenInStorage)) {
    return <Navigate to="/login" replace />;
  }

  if (
    location.pathname === '/strava-connect' || 
    location.pathname === '/onboarding' ||
    location.pathname === '/new-user-profile' ||
    location.pathname === '/new-user-weight' ||
    location.pathname === '/new-user-strava'
  ) {
    return children;
  }

  if (needsOnboarding) {
    return <Onboarding />;
  }

  return children;
};

export default ProtectedRoute;
