import React from 'react';
import { Sparkles, Crown, LogOut, Settings, ShieldCheck, Database } from 'lucide-react';
import { isDemoMode } from '../lib/supabaseClient';

interface HeaderProps {
  onOpenSettings?: () => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onLogout, isLoggedIn = true }) => {
  return (
    <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-md border-b border-gold-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-12 h-12 object-contain drop-shadow-md" />
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-wider bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400 bg-clip-text text-transparent font-serif">
                  MR CLEAN
                </span>
                <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-slate-100">
                  SNEAKERS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-wide font-medium flex items-center gap-1">
                <span>Limpieza & Restauración Profesional</span>
                <Sparkles className="w-2.5 h-2.5 text-gold-400 inline" />
              </p>
            </div>
          </div>

          {/* Right Action buttons & status indicator */}
          <div className="flex items-center space-x-3">
            {isDemoMode ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <Database className="w-3.5 h-3.5" />
                Modo Demostración
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Supabase En Vivo
              </span>
            )}

            {isLoggedIn && onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="p-2 text-slate-400 hover:text-gold-400 hover:bg-gold-500/10 rounded-lg border border-transparent hover:border-gold-500/20 transition-all"
                title="Configuración de WhatsApp y Negocio"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}

            {isLoggedIn && onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 bg-dark-800 hover:bg-rose-500/10 px-3 py-2 rounded-lg border border-slate-700 hover:border-rose-500/30 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
