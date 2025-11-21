import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Onboarding from './Onboarding';

const ProtectedRoute = ({ children }) => {
  const { token, loading, user } = useAuth();
  const location = useLocation();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
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
    } else if (!loading && !token) {
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

  if (!token) {
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
