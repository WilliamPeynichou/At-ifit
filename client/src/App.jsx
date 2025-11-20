import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StravaConnect from './pages/StravaConnect';
import StravaStats from './pages/StravaStats';
import KcalCalculator from './components/KcalCalculator';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-black text-slate-200 antialiased overflow-x-hidden relative">
          {/* Global Particle Background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 3 + 1}px`,
                  height: `${Math.random() * 3 + 1}px`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${10 + Math.random() * 20}s`
                }}
              />
            ))}
          </div>
          
          <div className="relative z-10">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/strava-connect"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <StravaConnect />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/strava-stats"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <StravaStats />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kcal-calculator"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <KcalCalculator />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
