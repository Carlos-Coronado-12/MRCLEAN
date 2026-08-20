import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Save, ShieldAlert, Check, HelpCircle, ExternalLink } from 'lucide-react';
import { BusinessSettings } from '../types/database';
import { supabase, isDemoMode } from '../lib/supabaseClient';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<BusinessSettings>({
    send_delivered_whatsapp: true,
    whatsapp_phone_number_id: '',
    whatsapp_access_token: '',
    whatsapp_business_account_id: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showMetaHelp, setShowMetaHelp] = useState(false);

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
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-xl w-full overflow-hidden shadow-gold-glow max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-950">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-400" />
            <h3 className="text-lg font-bold text-slate-100">Configuración Meta WhatsApp Cloud API</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Info Banner */}
          <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gold-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-gold-400" />
                API Oficial de Meta (WhatsApp Business)
              </span>
              <button
                type="button"
                onClick={() => setShowMetaHelp(!showMetaHelp)}
                className="text-xs text-gold-400 underline hover:text-gold-300 flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                ¿Cómo obtener credenciales?
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Configura tus claves oficiales de Meta para enviar mensajes de WhatsApp automatizados directos al cliente sin intervención manual.
            </p>
          </div>

          {showMetaHelp && (
            <div className="p-4 bg-dark-950 border border-dark-700 rounded-xl text-xs space-y-2 text-slate-300 leading-relaxed">
              <p className="font-bold text-gold-400">Pasos rápidos en Meta for Developers:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Ve a <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-gold-400 underline inline-flex items-center gap-0.5">Meta developers <ExternalLink className="w-3 h-3"/></a> y crea una App de tipo "Negocios".</li>
                <li>Agrega el producto "WhatsApp".</li>
                <li>Obtén tu <strong>ID de número de teléfono</strong> y tu <strong>Token de acceso temporal/permanente</strong>.</li>
                <li>Crea las plantillas aprobadas: <code className="bg-dark-800 text-gold-400 px-1 py-0.5 rounded">mr_clean_nuevo_pedido</code> y <code className="bg-dark-800 text-gold-400 px-1 py-0.5 rounded">mr_clean_pedido_listo</code>.</li>
              </ol>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Phone Number ID (ID del número de teléfono)
              </label>
              <input
                type="text"
                placeholder="Ej: 109823487652938"
                value={settings.whatsapp_phone_number_id || ''}
                onChange={e => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Meta Access Token (Token de acceso)
              </label>
              <input
                type="password"
                placeholder="EAA..."
                value={settings.whatsapp_access_token || ''}
                onChange={e => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp Business Account ID (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: 10293847561029"
                value={settings.whatsapp_business_account_id || ''}
                onChange={e => setSettings({ ...settings, whatsapp_business_account_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 font-mono text-xs"
              />
            </div>

            {/* Toggle Automations */}
            <div className="pt-4 border-t border-dark-700">
              <label className="flex items-center justify-between p-3 bg-dark-950 rounded-xl border border-dark-700 cursor-pointer hover:border-gold-500/30 transition-colors">
                <div>
                  <span className="font-semibold text-slate-200">Notificación al Entregar</span>
                  <p className="text-xs text-slate-400">Enviar WhatsApp automático de agradecimiento cuando el pedido pase a "Entregado".</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.send_delivered_whatsapp}
                  onChange={e => setSettings({ ...settings, send_delivered_whatsapp: e.target.checked })}
                  className="w-5 h-5 accent-gold-500 rounded cursor-pointer"
                />
              </label>
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
