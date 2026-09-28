import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import {
  fetchOrderByToken,
  fetchBusinessSettings,
  generateWhatsAppLink,
  fetchReviewByOrderId,
  fetchReviewByOrderNumber,
  createReview
} from '../services/orderService';
import { Order, OrderStatus, Review } from '../types/database';
import { STATUS_CONFIG, PaymentStatusBadge } from '../components/StatusBadge';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import {
  Crown, Sparkles, Calendar, Clock, CheckCircle2, Package, ShieldCheck,
  AlertCircle, Image as ImageIcon, Star, ThumbsUp, ThumbsDown, MessageSquare,
  Send, Heart, Award, ArrowDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

const STATUS_STEPS: { key: OrderStatus; label: string; sub: string }[] = [
  { key: 'received', label: 'RECIBIDO', sub: 'En tienda' },
  { key: 'in_progress', label: 'EN PROCESO', sub: 'Limpieza en curso' },
  { key: 'ready', label: 'LISTO', sub: 'Para entrega' },
  { key: 'delivered', label: 'ENTREGADO', sub: 'Servicio concluido' },
];

const SERVICE_ASPECT_OPTIONS = [
  'Limpieza Profunda Impecable',
  'Puntualidad en la Entrega',
  'Atención Amable & Rápida',
  'Aroma Fresco & Agradable',
  'Restauración de Suelas / Color',
  'Excelente Cuidado de Materiales'
];

const RATING_LABELS: Record<number, { title: string; subtitle: string; emoji: string }> = {
  5: { title: '¡Excelente Servicio!', subtitle: 'Superó todas mis expectativas', emoji: '🔥' },
  4: { title: 'Muy Buen Trabajo', subtitle: 'Quedé muy satisfecho con mis tenis', emoji: '👌' },
  3: { title: 'Buen Servicio', subtitle: 'Cumplió con lo acordado', emoji: '👍' },
  2: { title: 'Servicio Regular', subtitle: 'Hay detalles que pueden mejorar', emoji: '😐' },
  1: { title: 'No me gustó', subtitle: 'Tuve una mala experiencia', emoji: '😕' }
};

export const ClientOrderView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [storePhone, setStorePhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Review states
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [selectedAspects, setSelectedAspects] = useState<string[]>([
    'Limpieza Profunda Impecable',
    'Aroma Fresco & Agradable'
  ]);
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const reviewSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (token) {
      loadOrder(token);
    }
  }, [token]);

  // Manejar scroll hacia la sección de reseña si viene con hash #resena o query ?review=true
  useEffect(() => {
    const isReviewTarget =
      location.hash === '#resena' ||
      new URLSearchParams(location.search).get('review') === 'true' ||
      location.pathname.startsWith('/resena/');

    if (isReviewTarget && !loading && order) {
      setTimeout(() => {
        reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location, loading, order]);

  const loadOrder = async (orderToken: string) => {
    setLoading(true);
    setError(false);
    try {
      const [data, bSettings] = await Promise.all([
        fetchOrderByToken(orderToken),
        fetchBusinessSettings()
      ]);

      if (bSettings?.store_phone) {
        setStorePhone(bSettings.store_phone);
      }

      if (data) {
        setOrder(data);

        // Buscar si ya tiene una reseña registrada
        const review = await fetchReviewByOrderId(data.id) || await fetchReviewByOrderNumber(data.order_number);
        if (review) {
          setExistingReview(review);
          setReviewSuccess(true);
        }

        if (data.status === 'ready' || data.status === 'delivered') {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#F5ECC6', '#FFFFFF', '#38BDF8']
          });
        }
      } else {
        setError(true);
      }
    } catch (e) {
      console.error('Error cargando pedido del cliente:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleAspect = (aspect: string) => {
    setSelectedAspects(prev =>
      prev.includes(aspect)
        ? prev.filter(a => a !== aspect)
        : [...prev, aspect]
    );
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setSubmittingReview(true);
    try {
      const created = await createReview({
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
        service_aspects: selectedAspects,
        would_recommend: wouldRecommend,
        is_published: true
      });

      setExistingReview(created);
      setReviewSuccess(true);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#D4AF37', '#10B981', '#FFFFFF', '#F59E0B']
      });
    } catch (err) {
      console.error('Error enviando reseña:', err);
      alert('Ocurrió un error al enviar tu reseña. Por favor intenta de nuevo.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const scrollToReview = () => {
    reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center mx-auto shadow-gold-glow animate-pulse">
            <Crown className="w-8 h-8 text-black" />
          </div>
          <p className="text-sm font-semibold text-slate-300 tracking-wider">Cargando estado de tu pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
        <div className="bg-dark-900 border border-gold-500/20 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Pedido No Encontrado</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            No pudimos localizar la información para este código de seguimiento. Verifica que el enlace ingresado sea el correcto.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-black bg-gradient-to-r from-gold-400 to-amber-500 px-5 py-2.5 rounded-xl shadow-gold-glow-sm"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentStatusIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const activeRating = hoverRating || reviewRating;

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 selection:bg-gold-500 selection:text-black">
      
      {/* Mobile-first Header Banner */}
      <header className="bg-gradient-to-b from-dark-900 via-dark-900 to-dark-950 border-b border-gold-500/20 pt-8 pb-6 px-4 shadow-xl">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          
          <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-28 h-28 mx-auto object-contain drop-shadow-gold-glow" />

          <div>
            <span className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400 bg-clip-text text-transparent font-serif">
              MR CLEAN
            </span>
            <p className="text-xs font-extrabold tracking-[0.3em] text-slate-100 uppercase mt-0.5">
              SNEAKERS
            </p>
            <p className="text-xs text-slate-400 font-medium tracking-wide flex items-center justify-center gap-1 mt-0.5">
              <span>Limpieza & Restauración Especializada</span>
              <Sparkles className="w-3 h-3 text-gold-400" />
            </p>
          </div>

          <div className="inline-block bg-dark-950/80 px-4 py-1.5 rounded-full border border-gold-500/30">
            <span className="text-xs font-semibold text-slate-400">Orden de Servicio: </span>
            <span className="text-sm font-extrabold font-mono text-gold-400">#{order.order_number}</span>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        
        {/* Status Callout Banner */}
        <div className={`p-5 rounded-2xl border ${statusInfo.bg} ${statusInfo.border} backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left`}>
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado Actual de tu Pedido</span>
            <h2 className={`text-2xl font-extrabold ${statusInfo.text} flex items-center justify-center sm:justify-start gap-2`}>
              {statusInfo.label}
            </h2>
            <p className="text-xs text-slate-300">
              {order.status === 'received' && 'Tus tenis han sido recibidos en taller y están programados para limpieza.'}
              {order.status === 'in_progress' && 'Nuestros especialistas están trabajando detalladamente en tus tenis.'}
              {order.status === 'ready' && '¡Tus tenis han quedado como nuevos y ya están listos para ser entregados! 🔥'}
              {order.status === 'delivered' && '¡Muchas gracias por tu confianza! Esperamos que disfrutes tus tenis como nuevos. 👟✨'}
              {order.status === 'cancelled' && 'Este pedido fue cancelado.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {/* Si está entregado o listo, botón para ir directo a la reseña */}
            {(isDelivered || order.status === 'ready') && (
              <button
                onClick={scrollToReview}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs shadow-gold-glow-sm transition-all animate-bounce sm:animate-none"
              >
                <Star className="w-4 h-4 fill-slate-950" />
                {existingReview || reviewSuccess ? 'Ver mi Reseña' : 'Dejar Reseña'}
              </button>
            )}

            {/* Contact Store WhatsApp Button */}
            <a
              href={generateWhatsAppLink(order, 'contact_store', storePhone || undefined)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
            >
              <WhatsAppIcon className="w-4 h-4 fill-slate-950" />
              Contactar Tienda
            </a>
          </div>
        </div>

        {/* Visual Stepper Timeline */}
        {!isCancelled && (
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold-400 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Línea de Avance del Servicio
            </h3>

            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-4 right-4 h-1 bg-dark-700 -z-0 hidden sm:block" />
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-2 relative z-10">
                {STATUS_STEPS.map((step, idx) => {
                  const isPassed = currentStatusIndex >= idx;
                  const isCurrent = currentStatusIndex === idx;

                  return (
                    <div key={step.key} className="flex sm:flex-col items-center gap-3 sm:gap-2 text-left sm:text-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isCurrent
                            ? 'bg-gold-500 text-black shadow-gold-glow scale-110 border-2 border-white'
                            : isPassed
                            ? 'bg-emerald-500 text-black'
                            : 'bg-dark-800 text-slate-500 border border-dark-700'
                        }`}
                      >
                        {isPassed && !isCurrent ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>

                      <div>
                        <p className={`text-xs font-extrabold tracking-tight ${isCurrent ? 'text-gold-400' : isPassed ? 'text-slate-200' : 'text-slate-500'}`}>
                          {step.label}
                        </p>
                        <p className="text-[10px] text-slate-400">{step.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MÓDULO DE RESEÑA Y SATISFACCIÓN (LINK FUNCIONAL) */}
        {/* ========================================================= */}
        <div
          ref={reviewSectionRef}
          id="resena"
          className="scroll-mt-6 bg-gradient-to-b from-dark-900 to-dark-950 border-2 border-gold-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Decorative Glow */}
          <div className="absolute -top-24 -right-24 w-56 h-56 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header del módulo */}
          <div className="text-center space-y-2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-bold tracking-wider uppercase">
              <Award className="w-3.5 h-3.5" />
              Tu Opinión Cuenta
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              ¿Qué te pareció nuestro servicio?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              {order.customer_name}, tu calificación nos ayuda a seguir garantizando el mejor cuidado para tus sneakers.
            </p>
          </div>

          {/* Si ya existe reseña enviada o registrada */}
          {reviewSuccess && existingReview ? (
            <div className="bg-dark-950/90 border border-gold-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-300">
              <div className="w-14 h-14 bg-gradient-to-br from-gold-400 to-amber-600 rounded-full flex items-center justify-center mx-auto shadow-gold-glow">
                <CheckCircle2 className="w-8 h-8 text-black" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">¡Muchas Gracias por tu Reseña! ⭐</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Tu valoración para la orden <span className="font-mono text-gold-400 font-bold">#{order.order_number}</span> fue guardada exitosamente.
                </p>
              </div>

              {/* Detalle de la reseña enviada */}
              <div className="bg-dark-900/80 border border-dark-700 rounded-xl p-4 max-w-md mx-auto space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                  <div className="flex text-gold-400">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          existingReview.rating >= star ? 'fill-gold-400 text-gold-400' : 'text-dark-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gold-400">{existingReview.rating}.0 / 5.0</span>
                </div>

                {existingReview.comment && (
                  <p className="text-xs text-slate-200 italic">
                    "{existingReview.comment}"
                  </p>
                )}

                {existingReview.service_aspects && existingReview.service_aspects.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {existingReview.service_aspects.map((aspect, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-gold-500/10 text-gold-300 border border-gold-500/20 font-medium">
                        ✓ {aspect}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <a
                  href={generateWhatsAppLink(order, 'contact_store', storePhone || undefined)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg transition-all"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-black" />
                  Agendar Próximo Pedido por WhatsApp
                </a>
              </div>
            </div>
          ) : (
            /* Formulario para dejar reseña */
            <form onSubmit={handleReviewSubmit} className="space-y-6 relative z-10">
              
              {/* Star Rating Selector */}
              <div className="bg-dark-950/80 border border-dark-700 rounded-2xl p-5 text-center space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Selecciona tu Calificación
                </span>

                <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none transition-transform hover:scale-125 active:scale-95"
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          activeRating >= star
                            ? 'text-gold-400 fill-gold-400 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                            : 'text-dark-700 hover:text-gold-400/50'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <div className="inline-block px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30">
                  <span className="text-xs sm:text-sm font-bold text-gold-300">
                    {RATING_LABELS[activeRating]?.emoji} {RATING_LABELS[activeRating]?.title} —{' '}
                    <span className="text-slate-400 font-normal">{RATING_LABELS[activeRating]?.subtitle}</span>
                  </span>
                </div>
              </div>

              {/* Service Aspects Tags */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  ¿Qué fue lo que más te gustó? (Opcional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_ASPECT_OPTIONS.map(aspect => {
                    const isSelected = selectedAspects.includes(aspect);
                    return (
                      <button
                        key={aspect}
                        type="button"
                        onClick={() => toggleAspect(aspect)}
                        className={`text-xs px-3 py-2 rounded-xl font-semibold border transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-black border-gold-400 shadow-gold-glow-sm font-bold'
                            : 'bg-dark-950 text-slate-400 border-dark-700 hover:border-gold-500/40 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {aspect}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Would recommend question */}
              <div className="bg-dark-950/80 border border-dark-700 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300 text-center sm:text-left">
                  ¿Recomendarías Mr Clean Sneakers a tus conocidos?
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      wouldRecommend
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-md'
                        : 'bg-dark-900 text-slate-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Sí, 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWouldRecommend(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      !wouldRecommend
                        ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                        : 'bg-dark-900 text-slate-400 border-dark-700 hover:text-white'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    No
                  </button>
                </div>
              </div>

              {/* Free text comment */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Comentario o Mensaje Adicional (Opcional)</span>
                  <span className="text-[10px] text-slate-500 lowercase">máx. 300 caracteres</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Cuéntanos más sobre cómo quedaron tus tenis, la atención recibida o cualquier sugerencia..."
                  className="w-full bg-dark-950 border border-dark-700 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400 transition-colors"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-black font-extrabold text-sm shadow-gold-glow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submittingReview ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publicar mi Reseña
                  </>
                )}
              </button>

            </form>
          )}

        </div>

        {/* General Details & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Calendar className="w-4 h-4 text-gold-400" />
              Fecha de Recepción
            </div>
            <p className="text-sm font-bold text-slate-200">
              {new Date(order.reception_date).toLocaleDateString('es-MX', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
              <Clock className="w-4 h-4 text-gold-400" />
              Entrega Estimada
            </div>
            <p className="text-sm font-bold text-gold-400">
              {order.estimated_delivery_date
                ? new Date(order.estimated_delivery_date + 'T00:00:00').toLocaleDateString('es-MX', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'Por confirmar'}
            </p>
          </div>
        </div>

        {/* Customer & Payment Card */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-dark-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cliente</span>
              <p className="text-base font-bold text-slate-100">{order.customer_name}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estado del Pago</span>
              <div>
                <PaymentStatusBadge status={order.payment_status} />
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="text-xs bg-dark-950 p-3 rounded-xl border border-dark-800 text-slate-300">
              <span className="font-semibold text-gold-400">Nota del pedido: </span>
              {order.notes}
            </div>
          )}
        </div>

        {/* Sneakers & Services Breakdown */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Tenis y Servicios Incluidos ({order.order_items?.length || 0})
          </h3>

          <div className="space-y-4 divide-y divide-dark-800">
            {order.order_items?.map((item, i) => (
              <div key={i} className={i > 0 ? 'pt-4 space-y-3' : 'space-y-3'}>
                
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gold-400" />
                      {item.brand_model}
                    </h4>
                    <p className="text-xs text-slate-400 ml-4">{item.service_name}</p>
                  </div>
                  <span className="text-sm font-extrabold font-mono text-gold-400">
                    ${item.price.toFixed(2)}
                  </span>
                </div>

                {/* Photos Gallery */}
                {((item.before_photos && item.before_photos.length > 0) || (item.after_photos && item.after_photos.length > 0)) && (
                  <div className="ml-4 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Before Photos */}
                    {item.before_photos && item.before_photos.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> ANTES
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.before_photos.map((img, pIdx) => (
                            <img
                              key={pIdx}
                              src={img}
                              alt="Antes"
                              onClick={() => setSelectedPhoto(img)}
                              className="w-16 h-16 object-cover rounded-lg border border-dark-700 cursor-pointer hover:scale-105 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* After Photos */}
                    {item.after_photos && item.after_photos.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> DESPUÉS
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.after_photos.map((img, pIdx) => (
                            <img
                              key={pIdx}
                              src={img}
                              alt="Después"
                              onClick={() => setSelectedPhoto(img)}
                              className="w-16 h-16 object-cover rounded-lg border border-emerald-500/40 cursor-pointer hover:scale-105 transition-transform shadow-emerald-glow"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="border-t border-dark-700 pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Total del Servicio</span>
              <span className="text-2xl font-black text-gold-400 font-mono">${order.total_amount.toFixed(2)} MXN</span>
            </div>

            {order.payment_status === 'partial' && (
              <div className="bg-dark-950 p-3 rounded-xl border border-cyan-500/30 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[11px]">Abono Recibido:</span>
                  <span className="text-cyan-400 font-bold">${(order.paid_amount || 0).toFixed(2)} MXN</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 font-bold block text-[11px] uppercase tracking-wider">Saldo Pendiente al Recoger:</span>
                  <span className="text-base font-extrabold text-amber-400">
                    ${Math.max(0, order.total_amount - (order.paid_amount || 0)).toFixed(2)} MXN
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer info */}
        <footer className="text-center pt-6 pb-12 space-y-2 text-xs text-slate-500">
          <p className="flex items-center justify-center gap-1 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-gold-400" />
            Consulta oficial Mr Clean Sneakers — Sistema Seguro
          </p>
          <p>© {new Date().getFullYear()} Mr Clean Sneakers. Todos los derechos reservados.</p>
        </footer>

      </main>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center">
            <img src={selectedPhoto} alt="Ampliación" className="max-w-full max-h-[85vh] object-contain rounded-2xl border-2 border-gold-400 shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
};
