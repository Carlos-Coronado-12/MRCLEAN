import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Play, Pause, Square, Sparkles, Smile, Film, Palette, Code, 
  RotateCcw, Copy, Check, Upload, Download, RefreshCw, Star, Flame, Eye
} from 'lucide-react';
import { Avatar, type AvatarController } from '@bible-strong/avatar-react';
import '@bible-strong/avatar-react/styles.css';
import { defaultMascotJson } from './MascotAvatar';

interface MascotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { name: 'Cleancito Original (Negro & Amarillo)', body: '#000000', eyes: '#ffe01a', badge: '👑' },
  { name: 'Sneaker Triple White', body: '#f8fafc', eyes: '#38bdf8', badge: '⚪' },
  { name: 'Stealth Black & Emerald', body: '#090d16', eyes: '#10b981', badge: '🕶️' },
  { name: 'Cyber Wave (Púrpura & Ámbar)', body: '#1e1b4b', eyes: '#f59e0b', badge: '⚡' },
  { name: 'Chicago Infrared', body: '#18181b', eyes: '#ef4444', badge: '🔥' },
];

export const MascotModal: React.FC<MascotModalProps> = ({ isOpen, onClose }) => {
  const avatarRef = useRef<AvatarController>(null);
  
  // Active definition
  const [definition, setDefinition] = useState<any>(() => {
    const saved = localStorage.getItem('mrclean_custom_mascot_def');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.name === 'CLEANCITO' && parsed?.body?.primary?.width && parsed.body.primary.width > 50) {
          return parsed;
        }
      } catch (e) {
        // invalid
      }
    }
    localStorage.removeItem('mrclean_custom_mascot_def');
    return defaultMascotJson;
  });

  const [activeTab, setActiveTab] = useState<'controls' | 'presets' | 'json'>('controls');
  const [currentAnim, setCurrentAnim] = useState<string>('idle');
  const [currentExp, setCurrentExp] = useState<string>('neutral');
  const [avatarSize, setAvatarSize] = useState<number>(240);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(definition, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [bodyColor, setBodyColor] = useState<string>(definition.colors?.body || '#000000');
  const [eyeColor, setEyeColor] = useState<string>(definition.colors?.eyes || '#ffe01a');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('¡Hola! Soy CLEANCITO, la mascota de Mr. Clean Sneakers.');

  useEffect(() => {
    if (isOpen) {
      // Re-trigger default animation when opening modal
      setTimeout(() => {
        avatarRef.current?.play('idle');
        setCurrentAnim('idle');
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePlayAnimation = (animKey: string) => {
    setCurrentAnim(animKey);
    setCurrentExp(animKey);
    const res = avatarRef.current?.play(animKey);
    
    if (animKey === 'greeting') {
      setFeedbackMsg('¡Mucho gusto! Encantado de ayudarte con tus sneakers.');
    } else if (animKey === 'cleaning') {
      setFeedbackMsg('¡Manos a la obra! Dejando esos pares como de tienda 🧼✨');
    } else if (animKey === 'celebrate') {
      setFeedbackMsg('¡Woooow! 100% Calidad y Satisfacción garantizada 🎉');
    } else if (animKey === 'sleeping') {
      setFeedbackMsg('Zzz... descansando para el siguiente drop.');
    } else if (animKey === 'thinking') {
      setFeedbackMsg('Revisando el mejor tratamiento para este material...');
    } else {
      setFeedbackMsg('Mascota lista para interactuar.');
    }
  };

  const handleSetExpression = (expKey: string) => {
    setCurrentExp(expKey);
    avatarRef.current?.setExpression(expKey);
  };

  const handlePause = () => {
    avatarRef.current?.pause();
    setFeedbackMsg('Animación pausada.');
  };

  const handleStop = () => {
    avatarRef.current?.stop();
    setCurrentAnim('neutral');
    setCurrentExp('neutral');
    setFeedbackMsg('Mascota en reposo neutral.');
  };

  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setBodyColor(preset.body);
    setEyeColor(preset.eyes);
    const updated = {
      ...definition,
      colors: {
        body: preset.body,
        eyes: preset.eyes
      }
    };
    setDefinition(updated);
    setJsonInput(JSON.stringify(updated, null, 2));
    localStorage.setItem('mrclean_custom_mascot_def', JSON.stringify(updated));
    setFeedbackMsg(`Tema aplicado: ${preset.name}`);
  };

  const handleCustomColorChange = (newBody: string, newEyes: string) => {
    setBodyColor(newBody);
    setEyeColor(newEyes);
    const updated = {
      ...definition,
      colors: {
        body: newBody,
        eyes: newEyes
      }
    };
    setDefinition(updated);
    setJsonInput(JSON.stringify(updated, null, 2));
    localStorage.setItem('mrclean_custom_mascot_def', JSON.stringify(updated));
  };

  const handleResetToDefault = () => {
    setDefinition(defaultMascotJson);
    setBodyColor(defaultMascotJson.colors.body);
    setEyeColor(defaultMascotJson.colors.eyes);
    setJsonInput(JSON.stringify(defaultMascotJson, null, 2));
    localStorage.removeItem('mrclean_custom_mascot_def');
    setFeedbackMsg('Se restauró la mascota original de Mr. Clean.');
    handlePlayAnimation('greeting');
  };

  const handleApplyJson = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      if (!parsed.schema || !parsed.body || !parsed.expressions || !parsed.animations) {
        throw new Error('El JSON debe contener schema, body, expressions y animations según la especificación avatar-definition.');
      }
      setDefinition(parsed);
      localStorage.setItem('mrclean_custom_mascot_def', JSON.stringify(parsed));
      if (parsed.colors?.body) setBodyColor(parsed.colors.body);
      if (parsed.colors?.eyes) setEyeColor(parsed.colors.eyes);
      setFeedbackMsg('¡Nueva definición JSON cargada con éxito!');
      setActiveTab('controls');
      setTimeout(() => {
        avatarRef.current?.play('idle');
      }, 100);
    } catch (e: any) {
      setJsonError(e.message || 'Error al procesar el JSON');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonInput);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const animationsList = definition.animationOrder || Object.keys(definition.animations || {});
  const expressionsList = definition.expressionOrder || Object.keys(definition.expressions || {});

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-gold-500/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-dark-950 via-dark-900 to-dark-950 border-b border-gold-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center shadow-gold-glow-sm">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Mascota Interactiva 3D</h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 font-mono">
                  @bible-strong/avatar-react
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Controlador interactivo procedural para probar animaciones, expresiones y temas de color
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Top Stage & Avatar Display */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            
            {/* 3D Avatar Canvas Box */}
            <div className="md:col-span-6 bg-gradient-to-b from-dark-950 to-dark-900 border border-gold-500/25 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[340px] relative overflow-hidden shadow-inner group">
              
              {/* Stage lighting glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gold-500/15 rounded-full blur-3xl pointer-events-none" />
              
              {/* Interactive Avatar Component */}
              <div 
                className="cursor-pointer transition-transform hover:scale-105 active:scale-95 select-none relative z-10"
                onClick={() => handlePlayAnimation('greeting')}
                title="¡Haz clic en la mascota para saludar!"
              >
                <Avatar
                  ref={avatarRef}
                  definition={definition}
                  size={avatarSize}
                  defaultAnimation="idle"
                  autoplay={true}
                />
              </div>

              {/* Speech bubble */}
              <div className="mt-3 max-w-xs bg-dark-900/90 border border-gold-500/30 rounded-2xl px-3.5 py-1.5 text-center text-xs text-slate-200 shadow-lg relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="font-medium text-gold-300">"{feedbackMsg}"</p>
              </div>

              {/* Size Slider overlay */}
              <div className="absolute bottom-3 right-4 flex items-center gap-2 bg-dark-950/80 px-2.5 py-1 rounded-xl border border-dark-700 text-[10px] text-slate-400">
                <span>Tamaño:</span>
                <input
                  type="range"
                  min="140"
                  max="320"
                  value={avatarSize}
                  onChange={e => setAvatarSize(Number(e.target.value))}
                  className="w-16 accent-gold-400 cursor-pointer"
                />
                <span className="font-mono">{avatarSize}px</span>
              </div>

              {/* Quick Click Hint */}
              <div className="absolute top-3 left-4 text-[10px] text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-gold-400" />
                <span>Haz clic para interactuar</span>
              </div>

            </div>

            {/* Quick Playback Bar & Status Info */}
            <div className="md:col-span-6 space-y-4">
              
              {/* State Monitor */}
              <div className="bg-dark-950 border border-dark-800 rounded-2xl p-4 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-gold-400" />
                  Estado de Reproducción
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-dark-900 p-2.5 rounded-xl border border-dark-700/60">
                    <span className="text-[10px] text-slate-500 block">Animación activa:</span>
                    <span className="font-mono font-bold text-gold-400 capitalize">{currentAnim}</span>
                  </div>
                  <div className="bg-dark-900 p-2.5 rounded-xl border border-dark-700/60">
                    <span className="text-[10px] text-slate-500 block">Expresión actual:</span>
                    <span className="font-mono font-bold text-amber-300 capitalize">{currentExp}</span>
                  </div>
                </div>

                {/* Playback action controls */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handlePlayAnimation(currentAnim || 'idle')}
                    className="flex-1 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-gold-glow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Reproducir</span>
                  </button>
                  <button
                    onClick={handlePause}
                    className="px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 text-xs font-semibold border border-dark-700 transition-colors flex items-center gap-1.5"
                    title="Pausar en posición actual"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausa</span>
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-3.5 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-rose-400 text-xs font-semibold border border-dark-700 transition-colors flex items-center gap-1.5"
                    title="Detener y volver a neutral"
                  >
                    <Square className="w-3.5 h-3.5 fill-rose-400" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 bg-dark-950 p-1.5 rounded-2xl border border-dark-800">
                <button
                  onClick={() => setActiveTab('controls')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'controls'
                      ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>Animaciones & Expresiones</span>
                </button>
                <button
                  onClick={() => setActiveTab('presets')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'presets'
                      ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Colores & Estilos</span>
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'json'
                      ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>JSON Definition</span>
                </button>
              </div>

            </div>

          </div>

          {/* TAB 1: ANIMATIONS & EXPRESSIONS */}
          {activeTab === 'controls' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Animations Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-gold-400" />
                    <span>Animaciones Disponibles ({animationsList.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Haz clic para ejecutar la línea de tiempo</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {animationsList.map((animKey: string) => {
                    const animData = definition.animations?.[animKey];
                    const label = animData?.metadata?.label || animKey;
                    const desc = animData?.metadata?.description || '';
                    const isSelected = currentAnim === animKey;

                    return (
                      <button
                        key={animKey}
                        onClick={() => handlePlayAnimation(animKey)}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1 relative ${
                          isSelected
                            ? 'bg-gradient-to-r from-gold-500/20 via-gold-500/10 to-transparent border-gold-400 shadow-gold-glow-sm'
                            : 'bg-dark-950 border-dark-800 hover:border-dark-700 hover:bg-dark-850'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-xs font-bold capitalize ${isSelected ? 'text-gold-300' : 'text-slate-200'}`}>
                            {label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-900 border border-dark-700 text-slate-400">
                            {animData?.playbackMode || 'loop'}
                          </span>
                        </div>
                        {desc && (
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            {desc}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expressions Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-amber-400" />
                    <span>Expresiones Directas ({expressionsList.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Aplica una pose instantánea</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {expressionsList.map((expKey: string) => {
                    const isSelected = currentExp === expKey;
                    return (
                      <button
                        key={expKey}
                        onClick={() => handleSetExpression(expKey)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-dark-950 text-slate-400 border-dark-800 hover:text-slate-200 hover:border-dark-700'
                        }`}
                      >
                        <span>{expKey}</span>
                        {isSelected && <Sparkles className="w-3 h-3 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: COLOR PRESETS & CUSTOMIZER */}
          {activeTab === 'presets' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Presets Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-gold-400" />
                  <span>Paletas de Colores de Marca</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset)}
                      className="p-3.5 bg-dark-950 border border-dark-800 hover:border-gold-500/40 rounded-2xl text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{preset.badge}</span>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-gold-300 transition-colors">
                            {preset.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Cuerpo: {preset.body} • Ojos: {preset.eyes}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full border border-dark-700 shadow-sm"
                          style={{ backgroundColor: preset.body }}
                        />
                        <div
                          className="w-5 h-5 rounded-full border border-dark-700 shadow-sm"
                          style={{ backgroundColor: preset.eyes }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="bg-dark-950 border border-dark-800 rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-200">Personalizar Colores Hexadecimales</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block font-semibold">Color del Cuerpo (Body):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bodyColor}
                        onChange={e => handleCustomColorChange(e.target.value, eyeColor)}
                        className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-dark-700"
                      />
                      <input
                        type="text"
                        value={bodyColor}
                        onChange={e => handleCustomColorChange(e.target.value, eyeColor)}
                        className="flex-1 px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-400 block font-semibold">Color de los Ojos (Eyes):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={eyeColor}
                        onChange={e => handleCustomColorChange(bodyColor, e.target.value)}
                        className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-dark-700"
                      />
                      <input
                        type="text"
                        value={eyeColor}
                        onChange={e => handleCustomColorChange(bodyColor, e.target.value)}
                        className="flex-1 px-3 py-2 bg-dark-900 border border-dark-700 rounded-xl text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleResetToDefault}
                    className="px-3.5 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar Mascota Original</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: JSON DEFINITION */}
          {activeTab === 'json' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-gold-400" />
                    <span>Definición Avatar JSON (Schema v1)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Puedes editar, pegar o exportar cualquier definición compatible con `@bible-strong/avatar-react`.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-dark-700 transition-colors flex items-center gap-1.5"
                  >
                    {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedJson ? 'Copiado' : 'Copiar JSON'}</span>
                  </button>
                  <button
                    onClick={handleApplyJson}
                    className="px-4 py-1.5 bg-gold-500 hover:bg-gold-400 text-black font-bold rounded-xl text-xs transition-colors shadow-gold-glow-sm flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Aplicar Cambios</span>
                  </button>
                </div>
              </div>

              {jsonError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {jsonError}
                </div>
              )}

              <textarea
                rows={12}
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                className="w-full p-4 bg-dark-950 border border-dark-800 rounded-2xl text-xs font-mono text-gold-300/90 focus:outline-none focus:border-gold-400 transition-colors resize-y leading-relaxed"
              />
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-dark-950 border-t border-dark-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span>Mascota de Procedural Animation lista para integrar en la plataforma</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-dark-800 hover:bg-dark-700 text-slate-200 font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
