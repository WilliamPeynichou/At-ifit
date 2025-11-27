import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import StravaConnect from './pages/StravaConnect';
import StravaStats from './pages/StravaStats';
import KcalCalculator from './components/KcalCalculator';
import Onboarding from './components/Onboarding';
import StatsExplanation from './pages/StatsExplanation';
import NewUserProfile from './pages/NewUserProfile';
import NewUserWeight from './pages/NewUserWeight';
import NewUserStrava from './pages/NewUserStrava';
import StravaCallback from './pages/StravaCallback';
import Chatbot from './components/Chatbot';
import ParticlesBackground from './components/ParticlesBackground';


function App() {
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <div className="min-h-screen bg-black text-slate-200 antialiased overflow-x-hidden relative">
          {/* Global Particle Background */}
          <ParticlesBackground />
          
          <div className={`relative z-10 transition-all duration-300 ease-in-out ${isChatOpen ? 'md:mr-[400px]' : ''}`}>
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
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stats-explanation"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <StatsExplanation />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/new-user-profile"
                element={
                  <ProtectedRoute>
                    <NewUserProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/new-user-weight"
                element={
                  <ProtectedRoute>
                    <NewUserWeight />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/new-user-strava"
                element={
                  <ProtectedRoute>
                    <NewUserStrava />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/strava-callback"
                element={<StravaCallback />}
              />

            </Routes>
          </div>
          
          <Chatbot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
        </div>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
