import React, { useState, useRef, useEffect } from 'react';
import { Avatar, type AvatarController } from '@bible-strong/avatar-react';
import '@bible-strong/avatar-react/styles.css';
import { defaultMascotJson } from './MascotAvatar';
import { Sparkles, MessageCircle, X, Maximize2 } from 'lucide-react';

interface MascotWidgetProps {
  onOpenStudio: () => void;
  pendingPickupsCount?: number;
  inProgressOrdersCount?: number;
}

const GREETINGS = [
  '¡Bienvenido de vuelta a Mr. Clean Sneakers! 👟✨',
  '¡Todo listo para dejar esos pares relucientes! 🧼',
  'Haz clic en mí para abrir el estudio interactivo 3D 👑',
  '¡La calidad y el detalle siempre en primer lugar! 💎',
];

export const MascotWidget: React.FC<MascotWidgetProps> = ({
  onOpenStudio,
  pendingPickupsCount = 0,
  inProgressOrdersCount = 0,
}) => {
  const avatarRef = useRef<AvatarController>(null);
  const [speech, setSpeech] = useState<string>('');
  const [showBubble, setShowBubble] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Load custom definition if available
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

  useEffect(() => {
    // Initial dynamic greeting based on system status
    let initialGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    if (pendingPickupsCount > 0) {
      initialGreeting = `¡Hey! Tienes ${pendingPickupsCount} solicitud${pendingPickupsCount > 1 ? 'es' : ''} de colecta pendiente${pendingPickupsCount > 1 ? 's' : ''} 📦`;
    } else if (inProgressOrdersCount > 0) {
      initialGreeting = `¡Ánimo! Hay ${inProgressOrdersCount} pedido${inProgressOrdersCount > 1 ? 's' : ''} en proceso de limpieza 🧼`;
    }
    setSpeech(initialGreeting);

    const timer = setTimeout(() => {
      avatarRef.current?.play('greeting');
    }, 1500);

    return () => clearTimeout(timer);
  }, [pendingPickupsCount, inProgressOrdersCount]);

  const handleAvatarClick = () => {
    avatarRef.current?.play('celebrate');
    setSpeech('¡Abriendo el estudio interactivo! 🎉');
    setTimeout(() => {
      onOpenStudio();
    }, 400);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowBubble(true);
    avatarRef.current?.play('greeting');
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 select-none group">
      
      {/* Speech Bubble */}
      {showBubble && speech && (
        <div className="bg-dark-900/95 border border-gold-500/40 text-slate-100 text-xs px-3.5 py-2 rounded-2xl shadow-xl max-w-[220px] backdrop-blur-md relative animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="font-medium text-[11px] leading-relaxed text-gold-200">
            {speech}
          </p>
          <button
            onClick={e => {
              e.stopPropagation();
              setShowBubble(false);
            }}
            className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-dark-800 border border-dark-600 text-slate-400 hover:text-white flex items-center justify-center text-[10px]"
            title="Cerrar mensaje"
          >
            <X className="w-2.5 h-2.5" />
          </button>
          {/* Bubble tail */}
          <div className="w-2.5 h-2.5 bg-dark-900 border-r border-b border-gold-500/40 rotate-45 absolute -bottom-1.5 right-8" />
        </div>
      )}

      {/* Mascot Card Container */}
      <div 
        onClick={handleAvatarClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative bg-gradient-to-br from-dark-950/90 via-dark-900/90 to-dark-950/90 border-2 border-gold-500/30 hover:border-gold-400 rounded-3xl p-1 shadow-gold-glow-sm hover:shadow-gold-glow transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
        title="Haz clic para abrir el Estudio de la Mascota"
      >
        {/* Glow backdrop */}
        <div className="absolute inset-0 bg-gold-500/10 rounded-3xl blur-md pointer-events-none group-hover:bg-gold-500/20 transition-all" />

        {/* Mascot Mini Viewport */}
        <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden">
          <Avatar
            ref={avatarRef}
            definition={definition}
            size={90}
            defaultAnimation="idle"
            autoplay={true}
          />
        </div>

        {/* Action badge */}
        <div className="absolute -bottom-1 -left-1 bg-gradient-to-r from-gold-500 to-amber-500 text-black rounded-full p-1 shadow-md group-hover:scale-110 transition-transform">
          <Sparkles className="w-3 h-3 stroke-[2.5]" />
        </div>
      </div>

    </div>
  );
};
