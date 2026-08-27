import React, { useState } from 'react';
import { supabase, isDemoMode } from '../lib/supabaseClient';
import { Crown, Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('Mrcleansneakerss1@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isDemoMode) {
      setTimeout(() => {
        setLoading(false);
        onLoginSuccess();
      }, 500);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setErrorMsg(error.message || 'Credenciales inválidas');
      } else if (data.session) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 selection:bg-gold-500 selection:text-black">
      
      <div className="bg-dark-900 border border-gold-500/30 rounded-3xl p-8 max-w-md w-full shadow-gold-glow relative overflow-hidden space-y-6">
        
        {/* Glow backdrop decorative circle */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-32 h-32 mx-auto object-contain drop-shadow-gold-glow" />

          <div>
            <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400 bg-clip-text text-transparent font-serif">
              MR CLEAN
            </h1>
            <p className="text-xs font-extrabold tracking-[0.3em] text-slate-100 uppercase mt-0.5">
              SNEAKERS
            </p>
            <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-1 mt-1">
              <span>Panel de Control Administrativo</span>
              <Sparkles className="w-3 h-3 text-gold-400" />
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          
          <div>
            <label className="block font-semibold text-slate-300 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="admin@mrclean.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-slate-100 focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-slate-100 focus:outline-none focus:border-gold-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-black bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 hover:from-gold-300 hover:to-amber-400 rounded-xl shadow-gold-glow transition-all"
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
            <ArrowRight className="w-4 h-4 text-black" />
          </button>

        </form>

        {/* Demo Mode Instant Login Hint */}
        {isDemoMode && (
          <div className="pt-2 text-center border-t border-dark-800 space-y-2">
            <p className="text-[11px] text-amber-400 font-semibold flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Modo de Demostración Activo
            </p>
            <p className="text-[10px] text-slate-400">
              Presiona "Iniciar Sesión" con cualquier correo para acceder al panel de prueba.
            </p>
          </div>
        )}

      </div>

    </div>
  );
};
