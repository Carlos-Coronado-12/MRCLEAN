import React, { useState, useEffect } from 'react';
import { 
  Star, Sparkles, CheckCircle2, Heart, ThumbsUp, ThumbsDown, MessageSquare, 
  User, Phone, ShieldCheck, ArrowRight, RefreshCw, Send, Check, Award, Package, 
  AlertCircle, ExternalLink, Calendar
} from 'lucide-react';
import { createReview, fetchProducts, fetchBusinessSettings } from '../services/orderService';
import { Product, Review } from '../types/database';
import confetti from 'canvas-confetti';

const POPULAR_SERVICES = [
  { id: 'Limpieza Detallada', name: 'Limpieza Detallada', icon: '✨', desc: 'Lavado a mano profundo interior y exterior' },
  { id: 'Limpieza Sencilla', name: 'Limpieza Sencilla', icon: '🧼', desc: 'Mantenimiento exterior y suelas' },
  { id: 'Blanqueamiento de Suelas', name: 'Blanqueamiento de Suelas', icon: '⚪', desc: 'Desamarilleo y efecto hielo' },
  { id: 'Gorra', name: 'Limpieza de Gorra', icon: '🧢', desc: 'Horma, limpieza y desmanchado' },
  { id: 'Restauración / Pintura', name: 'Restauración / Pintura', icon: '🎨', desc: 'Retoque de color y detalles' },
  { id: 'Otro', name: 'Otro Servicio', icon: '✍️', desc: 'Especifica qué servicio te realizaron' }
];

const HIGHLIGHT_ASPECTS = [
  { id: 'Quedaron como nuevos ✨', label: 'Quedaron como nuevos ✨' },
  { id: 'Excelente atención 🤝', label: 'Excelente atención 🤝' },
  { id: 'Entrega rápida y puntual ⚡', label: 'Entrega rápida y puntual ⚡' },
  { id: 'Cuidado del material 🛡️', label: 'Cuidado del material 🛡️' },
  { id: 'Limpieza profunda impecable 👟', label: 'Limpieza profunda impecable 👟' },
  { id: 'Buen precio / calidad 💰', label: 'Buen precio / calidad 💰' }
];

const RATING_LABELS: Record<number, { text: string; color: string }> = {
  5: { text: '¡Excelente! Quedé 100% satisfecho/a ⭐⭐⭐⭐⭐', color: 'text-gold-400' },
  4: { text: 'Muy buen trabajo y atención ⭐⭐⭐⭐', color: 'text-amber-300' },
  3: { text: 'Buen servicio ⭐⭐⭐', color: 'text-yellow-400' },
  2: { text: 'Regular, puede mejorar ⭐⭐', color: 'text-orange-400' },
  1: { text: 'No cumplió mis expectativas ⭐', color: 'text-rose-400' }
};

export const PastReviewPage: React.FC = () => {
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [selectedService, setSelectedService] = useState('Limpieza Detallada');
  const [customServiceName, setCustomServiceName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedAspects, setSelectedAspects] = useState<string[]>([
    'Quedaron como nuevos ✨',
    'Excelente atención 🤝'
  ]);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [customerPhone, setCustomerPhone] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);
  const [dbServices, setDbServices] = useState<Product[]>([]);
  const [storePhone, setStorePhone] = useState('6147324931');
  const [errors, setErrors] = useState<{ name?: string; service?: string }>({});

  useEffect(() => {
    // Load products and business settings
    const loadInitData = async () => {
      try {
        const [products, settings] = await Promise.all([
          fetchProducts(),
          fetchBusinessSettings()
        ]);
        if (products && products.length > 0) {
          setDbServices(products);
        }
        if (settings?.store_phone) {
          setStorePhone(settings.store_phone);
        }
      } catch (err) {
        console.warn('Error cargando servicios iniciales:', err);
      }
    };
    loadInitData();
  }, []);

  const toggleAspect = (aspect: string) => {
    setSelectedAspects(prev => 
      prev.includes(aspect) 
        ? prev.filter(a => a !== aspect)
        : [...prev, aspect]
    );
  };

  const validate = () => {
    const err: { name?: string; service?: string } = {};
    if (!customerName.trim()) {
      err.name = 'Por favor ingresa tu nombre';
    }
    if (selectedService === 'Otro' && !customServiceName.trim()) {
      err.service = 'Por favor escribe qué servicio te realizaron';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    const finalServiceName = selectedService === 'Otro' 
      ? customServiceName.trim() 
      : selectedService;

    // Generar un correlativo histórico representativo
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `HIST-${randomCode}`;

    try {
      const created = await createReview({
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || undefined,
        service_name: finalServiceName,
        rating: rating,
        comment: comment.trim() || undefined,
        service_aspects: [finalServiceName, ...selectedAspects.filter(a => a !== finalServiceName)],
        would_recommend: wouldRecommend,
        is_published: true,
        is_featured: rating >= 4
      });

      setSubmittedReview(created);
      setIsSuccess(true);

      confetti({
        particleCount: 130,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#D4AF37', '#10B981', '#FFFFFF', '#F59E0B']
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error al guardar reseña:', err);
      alert('Ocurrió un inconveniente al enviar tu reseña. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCustomerName('');
    setSelectedService('Limpieza Detallada');
    setCustomServiceName('');
    setRating(5);
    setComment('');
    setSelectedAspects(['Quedaron como nuevos ✨', 'Excelente atención 🤝']);
    setWouldRecommend(true);
    setCustomerPhone('');
    setIsSuccess(false);
    setSubmittedReview(null);
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col selection:bg-gold-500/30 selection:text-gold-200">
      
      {/* Background glowing effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-dark-900/90 backdrop-blur-md border-b border-gold-500/20 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-10 h-10 object-contain drop-shadow-md" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-wider bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400 bg-clip-text text-transparent font-serif">
                  MR CLEAN
                </span>
                <span className="text-xs uppercase tracking-[0.2em] font-extrabold text-slate-100">
                  SNEAKERS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span>Tu Opinión Nos Impulsa</span>
                <Sparkles className="w-2.5 h-2.5 text-gold-400" />
              </p>
            </div>
          </div>

          <a
            href="/agendar"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-500/30 transition-all flex items-center gap-1.5"
          >
            <span>Agendar Colecta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {isSuccess ? (
          /* SUCCESS STATE */
          <div className="bg-dark-900 border border-gold-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-300 text-center">
            
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-gold-500/20 border-2 border-gold-400 flex items-center justify-center mx-auto shadow-gold-glow animate-bounce">
              <Check className="w-10 h-10 text-gold-400 stroke-[3]" />
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/30 inline-block">
                ¡Reseña Registrada con Éxito!
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                ¡Muchas Gracias, {customerName}! 🎉
              </h1>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Tu opinión es invaluable para nosotros y nos ayuda a seguir brindando el mejor cuidado y acabado para el calzado de Chihuahua.
              </p>
            </div>

            {/* Review Summary Card */}
            <div className="bg-dark-950 border border-dark-700/80 rounded-2xl p-5 text-left space-y-3">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-white">{customerName}</h4>
                  <span className="text-xs text-gold-400 font-medium">
                    Servicio: {selectedService === 'Otro' ? customServiceName : selectedService}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-dark-900 px-2.5 py-1 rounded-lg border border-dark-700">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        rating >= s ? 'text-gold-400 fill-gold-400' : 'text-dark-700'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-gold-400 ml-1">{rating}.0</span>
                </div>
              </div>

              {comment && (
                <p className="text-xs text-slate-300 italic bg-dark-900/50 p-3 rounded-xl border border-dark-800">
                  "{comment}"
                </p>
              )}

              {selectedAspects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedAspects.map((aspect, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-300 border border-gold-500/20"
                    >
                      ✓ {aspect}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/agendar"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-black font-extrabold text-sm shadow-gold-glow-sm hover:shadow-gold-glow transition-all flex items-center justify-center gap-2"
              >
                <span>Agendar Nueva Colecta</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 hover:text-white font-bold text-sm border border-dark-700 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Dejar otra reseña</span>
              </button>
            </div>

          </div>
        ) : (
          /* REVIEW FORM */
          <div className="space-y-8">
            
            {/* Page Header Banner */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-bold tracking-wide">
                <Star className="w-3.5 h-3.5 fill-gold-400" />
                <span>Califica tu Experiencia en Mr. Clean</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                ¿Qué tal quedaron tus Tenis?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Completa este breve formulario en 30 segundos para ayudarnos a mantener los estándares más altos de calidad.
              </p>
            </div>

            {/* Main Form Card */}
            <form onSubmit={handleSubmit} className="bg-dark-900 border border-gold-500/20 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
              
              {/* 1. Nombre del Cliente */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gold-400" />
                  <span>1. Tu Nombre <span className="text-gold-400">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Ej. Carlos Coronado"
                  className={`w-full px-4 py-3 bg-dark-950 border rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-400/40 transition-all ${
                    errors.name ? 'border-rose-500' : 'border-dark-700 focus:border-gold-400'
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* 2. Servicio que te realizaron */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-gold-400" />
                  <span>2. Servicio que te realizaron <span className="text-gold-400">*</span></span>
                </label>
                
                {/* Popular Services Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {POPULAR_SERVICES.map(svc => {
                    const isSelected = selectedService === svc.id;
                    return (
                      <button
                        type="button"
                        key={svc.id}
                        onClick={() => {
                          setSelectedService(svc.id);
                          if (errors.service) setErrors(prev => ({ ...prev, service: undefined }));
                        }}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative ${
                          isSelected
                            ? 'bg-gradient-to-r from-gold-500/15 via-gold-500/10 to-transparent border-gold-400/80 shadow-gold-glow-sm'
                            : 'bg-dark-950 border-dark-800 hover:border-dark-700 hover:bg-dark-850 text-slate-400'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{svc.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-gold-300' : 'text-slate-200'}`}>
                            {svc.name}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            {svc.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-gold-400 text-black flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* If 'Otro' is selected, custom text input */}
                {selectedService === 'Otro' && (
                  <div className="pt-1 animate-in fade-in slide-in-from-top-2 duration-200 space-y-1.5">
                    <input
                      type="text"
                      value={customServiceName}
                      onChange={e => {
                        setCustomServiceName(e.target.value);
                        if (errors.service) setErrors(prev => ({ ...prev, service: undefined }));
                      }}
                      placeholder="Escribe el nombre del servicio realizado (ej. Restauración de Gamuza, Plantillas, etc.)"
                      className={`w-full px-4 py-2.5 bg-dark-950 border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-400/40 ${
                        errors.service ? 'border-rose-500' : 'border-dark-700 focus:border-gold-400'
                      }`}
                    />
                    {errors.service && (
                      <p className="text-xs text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.service}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Calificación de Estrellas */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
                  <span>3. Tu Calificación General <span className="text-gold-400">*</span></span>
                </label>

                <div className="bg-dark-950 border border-dark-800 rounded-2xl p-4 sm:p-5 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {[1, 2, 3, 4, 5].map(star => {
                      const active = (hoverRating || rating) >= star;
                      return (
                        <button
                          type="button"
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(star)}
                          className="p-1 sm:p-2 transition-transform hover:scale-125 focus:outline-none"
                          title={`${star} Estrellas`}
                        >
                          <Star
                            className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                              active
                                ? 'fill-gold-400 text-gold-400 filter drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                                : 'text-dark-700 hover:text-dark-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <p className={`text-xs sm:text-sm font-extrabold ${RATING_LABELS[hoverRating || rating]?.color || 'text-gold-400'}`}>
                    {RATING_LABELS[hoverRating || rating]?.text}
                  </p>
                </div>
              </div>

              {/* 4. Comentario / Opinión */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-gold-400" />
                    <span>4. Comentario u Opinión (Opcional)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Aparecerá en nuestra web</span>
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Cuéntanos qué te pareció el resultado, cómo quedó tu calzado o cómo fue la atención recibida..."
                  className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/40 transition-all resize-none"
                />
              </div>

              {/* 5. Aspectos que te gustaron (Chips) */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  5. ¿Qué fue lo que más te gustó? (Selecciona los que apliquen)
                </label>
                <div className="flex flex-wrap gap-2">
                  {HIGHLIGHT_ASPECTS.map(asp => {
                    const isSelected = selectedAspects.includes(asp.id);
                    return (
                      <button
                        type="button"
                        key={asp.id}
                        onClick={() => toggleAspect(asp.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-gold-glow-sm'
                            : 'bg-dark-950 text-slate-400 border-dark-800 hover:border-dark-700 hover:text-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-gold-400 stroke-[3]" />}
                        <span>{asp.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 6. ¿Recomendarías Mr Clean Sneakers? */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  6. ¿Recomendarías nuestro servicio a tus amigos o familiares?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={`py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      wouldRecommend
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-glow-sm'
                        : 'bg-dark-950 text-slate-500 border-dark-800 hover:text-slate-300'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4 text-emerald-400" />
                    <span>¡Sí, totalmente!</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={`py-2.5 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      !wouldRecommend
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-dark-950 text-slate-500 border-dark-800 hover:text-slate-300'
                    }`}
                  >
                    <ThumbsDown className="w-4 h-4 text-rose-400" />
                    <span>No en esta ocasión</span>
                  </button>
                </div>
              </div>

              {/* 7. Teléfono o WhatsApp (Opcional) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Teléfono o WhatsApp (Opcional)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">Para enviarte promociones exclusivas</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Ej. 614 123 4567"
                  className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-400"
                />
              </div>

              {/* Submit CTA Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-400 hover:from-gold-400 hover:to-amber-300 text-black font-extrabold text-sm sm:text-base shadow-gold-glow hover:shadow-gold-glow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Guardando tu reseña...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 stroke-[2.5]" />
                      <span>Enviar mi Reseña ✨</span>
                    </>
                  )}
                </button>
              </div>

              {/* Privacy / Assurance */}
              <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1 pt-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Tu información se procesa de forma segura con Mr. Clean Sneakers</span>
              </p>

            </form>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-dark-800/80 bg-dark-950 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Mr. Clean Sneakers Chihuahua. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
};
