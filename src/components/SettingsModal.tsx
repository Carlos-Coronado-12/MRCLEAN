import React, { useState, useEffect } from 'react';
import { X, Save, Check, Settings } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { BusinessSettings } from '../types/database';
import { supabase, isDemoMode } from '../lib/supabaseClient';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<BusinessSettings>({
    store_phone: '6147324931',
    send_delivered_whatsapp: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    if (isDemoMode) {
      const stored = localStorage.getItem('mrclean_settings_db_v1');
      if (stored) {
        try { setSettings(JSON.parse(stored)); } catch {}
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .single();
      if (data && !error) {
        setSettings(data);
      }
    } catch (e) {
      console.warn('Error cargando configuración:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (isDemoMode) {
      localStorage.setItem('mrclean_settings_db_v1', JSON.stringify(settings));
      setSaving(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
      return;
    }

    try {
      if (settings.id) {
        await supabase.from('business_settings').update(settings).eq('id', settings.id);
      } else {
        await supabase.from('business_settings').insert([settings]);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Error guardando configuración:', err);
      alert('Error guardando la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-gold-glow flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gold-500/10 rounded-xl border border-gold-500/20 text-gold-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Configuración del Negocio</h3>
              <p className="text-xs text-slate-400">Teléfono de atención y datos de la tienda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-6 text-sm">
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gold-400 mb-1 flex items-center gap-1.5">
                <WhatsAppIcon className="w-3.5 h-3.5 fill-gold-400" />
                Número de WhatsApp de la Tienda (Atención a Clientes)
              </label>
              <input
                type="text"
                placeholder="Ej: 6147324931"
                value={settings.store_phone || ''}
                onChange={e => setSettings({ ...settings, store_phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-gold-500/30 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Número al que te contactarán los clientes cuando presionen el botón de "Contactar a la Tienda".
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-lg border border-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-black bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 rounded-lg shadow-gold-glow-sm disabled:opacity-50"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-black" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : savedSuccess ? '¡Guardado!' : 'Guardar Configuración'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
