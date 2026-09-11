import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { ClientOrderView } from './pages/ClientOrderView';
import { SchedulePickupPage } from './pages/SchedulePickupPage';
import { LoginPage } from './pages/LoginPage';
import { supabase, isDemoMode } from './lib/supabaseClient';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      // En modo demo, recordar si ya se autenticó en la sesión
      const session = localStorage.getItem('mrclean_auth_session');
      setIsAuthenticated(session === 'true');
      return;
    }

    // Verificar sesión real de Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    if (isDemoMode) {
      localStorage.setItem('mrclean_auth_session', 'true');
    }
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    if (isDemoMode) {
      localStorage.removeItem('mrclean_auth_session');
    } else {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        
        {/* Rutas públicas del cliente (NO requieren login) */}
        <Route path="/pedido/:token" element={<ClientOrderView />} />
        <Route path="/agendar" element={<SchedulePickupPage />} />
        <Route path="/colecta" element={<SchedulePickupPage />} />

        {/* Panel Administrativo (Requiere login) */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <AdminDashboard onLogout={handleLogout} />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
