import React from 'react';
import { Sparkles, Crown, LogOut, Settings, ShieldCheck, Database, UserCheck, Package } from 'lucide-react';
import { isDemoMode } from '../lib/supabaseClient';

interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenCustomers?: () => void;
  onOpenProducts?: () => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenCustomers, onOpenProducts, onLogout, isLoggedIn = true }) => {
  return (
    <header className="sticky top-0 z-40 bg-dark-900/90 backdrop-blur-md border-b border-gold-500/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-md shrink-0" />
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="font-extrabold text-sm sm:text-lg tracking-wider bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400 bg-clip-text text-transparent font-serif truncate">
                  MR CLEAN
                </span>
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-extrabold text-slate-100 truncate">
                  SNEAKERS
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 tracking-wide font-medium hidden sm:flex items-center gap-1 whitespace-nowrap">
                <span>Limpieza & Restauración Profesional</span>
                <Sparkles className="w-2.5 h-2.5 text-gold-400 shrink-0 inline" />
              </p>
            </div>
          </div>

          {/* Right Action buttons & status indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {isDemoMode ? (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
                <Database className="w-3.5 h-3.5 shrink-0" />
                Modo Demostración
              </span>
            ) : (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Supabase En Vivo
              </span>
            )}

            {isLoggedIn && onOpenProducts && (
              <button
                onClick={onOpenProducts}
                className="p-2 sm:px-3 sm:py-2 text-slate-300 hover:text-gold-400 bg-dark-950 hover:bg-gold-500/10 rounded-xl border border-dark-700 hover:border-gold-500/30 transition-all flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0"
                title="Menú y Catálogo de Productos/Servicios"
              >
                <Package className="w-4 h-4 text-gold-400 shrink-0" />
                <span className="hidden md:inline">Productos</span>
              </button>
            )}

            {isLoggedIn && onOpenCustomers && (
              <button
                onClick={onOpenCustomers}
                className="p-2 sm:px-3 sm:py-2 text-slate-300 hover:text-gold-400 bg-dark-950 hover:bg-gold-500/10 rounded-xl border border-dark-700 hover:border-gold-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
                title="Catálogo de Clientes Frecuentes"
              >
                <UserCheck className="w-4 h-4 text-gold-400 shrink-0" />
                <span className="hidden md:inline">Clientes</span>
              </button>
            )}

            {isLoggedIn && onLogout && (
              <button
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-2 flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 bg-dark-800 hover:bg-rose-500/10 rounded-xl border border-slate-700 hover:border-rose-500/30 transition-all whitespace-nowrap shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
