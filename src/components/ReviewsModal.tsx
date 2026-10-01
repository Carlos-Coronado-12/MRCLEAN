import React, { useState, useEffect } from 'react';
import { Review } from '../types/database';
import { fetchReviews, toggleReviewPublished, toggleReviewFeatured, deleteReview, generatePastReviewWhatsAppShareLink } from '../services/orderService';
import { WhatsAppIcon } from './WhatsAppIcon';
import {
  X, Star, MessageSquare, ThumbsUp, Trash2, Eye, EyeOff, Search,
  Award, Sparkles, Filter, CheckCircle2, User, Phone, Calendar,
  Copy, Check, ExternalLink, Link2, Share2, Tag
} from 'lucide-react';

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrder?: (orderNumber: string) => void;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  onOpenOrder
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'hidden'>('all');
  const [filterFeatured, setFilterFeatured] = useState<'all' | 'featured'>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReviews();
    }
  }, [isOpen]);

  const pastReviewUrl = `${window.location.origin}/dejar-resena`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pastReviewUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const waUrl = generatePastReviewWhatsAppShareLink(pastReviewUrl);
    window.open(waUrl, '_blank');
  };

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await fetchReviews(false);
      setReviews(data);
    } catch (err) {
      console.error('Error cargando reseñas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublished = async (review: Review) => {
    const identifier = review.id || review.order_number;
    if (!identifier) return;
    try {
      const updated = await toggleReviewPublished(identifier, !review.is_published);
      setReviews(prev => prev.map(r => (r.id === review.id || r.order_number === review.order_number) ? updated : r));
    } catch (err) {
      console.error('Error al cambiar visibilidad de reseña:', err);
    }
  };

  const handleToggleFeatured = async (review: Review) => {
    const identifier = review.id || review.order_number;
    if (!identifier) return;
    try {
      const updated = await toggleReviewFeatured(identifier, !review.is_featured);
      setReviews(prev => prev.map(r => (r.id === review.id || r.order_number === review.order_number) ? updated : r));
    } catch (err) {
      console.error('Error al cambiar destacado de reseña:', err);
    }
  };

  const handleDelete = async (review: Review) => {
    const identifier = review.id || review.order_number;
    if (!identifier) return;
    if (window.confirm(`¿Estás seguro de eliminar la reseña de "${review.customer_name}"?`)) {
      try {
        await deleteReview(identifier);
      } catch (err) {
        console.error('Error al eliminar reseña:', err);
      } finally {
        // Actualizar el estado siempre para que la lista y KPIs reflejen el borrado de inmediato
        setReviews(prev => prev.filter(r => (review.id ? r.id !== review.id : r.order_number !== review.order_number)));
      }
    }
  };

  if (!isOpen) return null;

  // KPIs
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';
  const recommendationCount = reviews.filter(r => r.would_recommend !== false).length;
  const recommendationPct = totalReviews > 0
    ? Math.round((recommendationCount / totalReviews) * 100)
    : 100;

  const count5 = reviews.filter(r => r.rating === 5).length;
  const count4 = reviews.filter(r => r.rating === 4).length;
  const count3 = reviews.filter(r => r.rating === 3).length;
  const count2 = reviews.filter(r => r.rating === 2).length;
  const count1 = reviews.filter(r => r.rating === 1).length;

  // Filtrado
  const filteredReviews = reviews.filter(r => {
    const matchSearch =
      r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.comment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.customer_phone || '').includes(searchTerm);

    const matchRating = ratingFilter === 'all' || r.rating === ratingFilter;
    const matchPublished =
      filterPublished === 'all'
        ? true
        : filterPublished === 'published'
        ? r.is_published !== false
        : r.is_published === false;

    const matchFeatured =
      filterFeatured === 'all'
        ? true
        : filterFeatured === 'featured'
        ? r.is_featured === true
        : r.is_featured !== true;

    return matchSearch && matchRating && matchPublished && matchFeatured;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-dark-900 border border-gold-500/30 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-dark-950 via-dark-900 to-dark-950 border-b border-gold-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center shadow-gold-glow-sm">
              <Star className="w-5 h-5 text-black fill-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Reseñas y Satisfacción de Clientes
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-400 border border-gold-500/20">
                  {totalReviews} recibidas
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Calificaciones y opiniones enviadas por clientes al finalizar sus pedidos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">

          {/* Metric Cards Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Average Rating */}
            <div className="bg-dark-950 border border-dark-700 p-4 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Promedio General</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-gold-400">{averageRating}</span>
                  <div className="flex text-gold-400">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          parseFloat(averageRating) >= star
                            ? 'fill-gold-400 text-gold-400'
                            : parseFloat(averageRating) >= star - 0.5
                            ? 'fill-gold-400/50 text-gold-400'
                            : 'text-dark-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation Rate */}
            <div className="bg-dark-950 border border-dark-700 p-4 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ThumbsUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recomendación</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">{recommendationPct}%</span>
                  <span className="text-xs text-slate-400 font-medium">({recommendationCount} de {totalReviews})</span>
                </div>
              </div>
            </div>

            {/* Ratings Breakdown Mini */}
            <div className="bg-dark-950 border border-dark-700 p-4 rounded-xl flex flex-col justify-center space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Distribución</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-gold-400">5★: {count5}</span>
                <span className="text-slate-600">•</span>
                <span className="font-bold text-amber-300">4★: {count4}</span>
                <span className="text-slate-600">•</span>
                <span className="font-bold text-slate-400">3★: {count3}</span>
                <span className="text-slate-600">•</span>
                <span className="font-bold text-rose-400">≤2★: {count2 + count1}</span>
              </div>
            </div>

          </div>

          {/* Link para Reseñas Pasadas & Clientes Anteriores */}
          <div className="bg-gradient-to-r from-gold-500/10 via-dark-950 to-dark-950 border border-gold-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-gold-glow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping" />
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-gold-400" />
                  Link para Recopilar Reseñas Pasadas
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Pide únicamente su nombre y servicio realizado. Ideal para enviar a clientes anteriores por WhatsApp.
              </p>
              <div className="pt-0.5 flex items-center gap-2 text-[10px] text-gold-400/90 font-mono">
                <span>{pastReviewUrl}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  copiedLink
                    ? 'bg-emerald-500 text-white shadow-emerald-glow-sm'
                    : 'bg-gold-500 hover:bg-gold-400 text-black shadow-gold-glow-sm'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>¡Enlace Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Compartir plantilla de invitación por WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 fill-emerald-400" />
                <span>WhatsApp</span>
              </button>

              <a
                href="/dejar-resena"
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white border border-dark-700 text-xs transition-colors"
                title="Abrir formulario en nueva pestaña"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, orden o texto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-dark-950 border border-dark-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-gold-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={ratingFilter}
                onChange={e => setRatingFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-gold-400"
              >
                <option value="all">Todas las Estrellas</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 estrellas)</option>
                <option value="4">⭐⭐⭐⭐ (4 estrellas)</option>
                <option value="3">⭐⭐⭐ (3 estrellas)</option>
                <option value="2">⭐⭐ (2 estrellas)</option>
                <option value="1">⭐ (1 estrella)</option>
              </select>

              <select
                value={filterPublished}
                onChange={e => setFilterPublished(e.target.value as any)}
                className="bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-gold-400"
              >
                <option value="all">Publicadas y Ocultas</option>
                <option value="published">Sólo Publicadas</option>
                <option value="hidden">Ocultas</option>
              </select>

              <select
                value={filterFeatured}
                onChange={e => setFilterFeatured(e.target.value as any)}
                className="bg-dark-950 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-gold-400"
              >
                <option value="all">Todas (Destacadas y Normales)</option>
                <option value="featured">⭐ Sólo Destacadas en Colecta</option>
              </select>
            </div>
          </div>

          {/* Reviews List */}
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando opiniones de clientes...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="py-12 text-center bg-dark-950 border border-dark-800 rounded-2xl space-y-3 p-6">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No se encontraron reseñas</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Las reseñas enviadas por tus clientes a través del link de agradecimiento de WhatsApp aparecerán aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map(review => (
                <div
                  key={review.id || review.order_number}
                  className={`bg-dark-950 border transition-all rounded-2xl p-4 sm:p-5 space-y-3 ${
                    review.is_featured
                      ? 'border-gold-500/50 shadow-gold-glow-sm bg-gradient-to-r from-dark-950 via-dark-900 to-dark-950'
                      : 'border-dark-800 hover:border-gold-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dark-800/80 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold text-xs">
                        {review.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-white">{review.customer_name}</h4>
                          <span className="text-[10px] font-mono bg-dark-900 border border-dark-700 px-2 py-0.5 rounded text-gold-400 font-bold">
                            #{review.order_number}
                          </span>
                          {review.service_name && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              {review.service_name}
                            </span>
                          )}
                          {review.order_number.startsWith('HIST-') && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              Reseña Directa
                            </span>
                          )}
                          {review.is_featured && (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30 flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-gold-400 text-gold-400" />
                              Destacada en Colecta
                            </span>
                          )}
                        </div>
                        {review.created_at && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(review.created_at).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* Star Rating */}
                      <div className="flex items-center gap-1 bg-dark-900 px-2.5 py-1 rounded-lg border border-dark-700">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              review.rating >= star ? 'text-gold-400 fill-gold-400' : 'text-dark-700'
                            }`}
                          />
                        ))}
                        <span className="text-xs font-bold text-gold-400 ml-1">{review.rating}.0</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {/* Toggle Featured */}
                        <button
                          onClick={() => handleToggleFeatured(review)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                            review.is_featured
                              ? 'bg-gold-500/20 border-gold-500/40 text-gold-300 hover:bg-gold-500/30'
                              : 'bg-dark-800 border-dark-700 text-slate-500 hover:text-gold-400'
                          }`}
                          title={review.is_featured ? 'Quitar de destacadas en colecta' : 'Destacar en sección de colecta / referencias'}
                        >
                          <Star className={`w-3.5 h-3.5 ${review.is_featured ? 'fill-gold-400 text-gold-400' : ''}`} />
                        </button>

                        {/* Toggle Published */}
                        <button
                          onClick={() => handleTogglePublished(review)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            review.is_published !== false
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-dark-800 border-dark-700 text-slate-500 hover:text-slate-300'
                          }`}
                          title={review.is_published !== false ? 'Reseña visible' : 'Reseña oculta'}
                        >
                          {review.is_published !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(review)}
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Eliminar reseña"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic bg-dark-900/60 p-3 rounded-xl border border-dark-800">
                      "{review.comment}"
                    </p>
                  )}

                  {/* Aspects Badges */}
                  {review.service_aspects && review.service_aspects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {review.service_aspects.map((aspect, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-300 border border-gold-500/20"
                        >
                          ✓ {aspect}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Recommendation badge */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
                    {review.would_recommend !== false ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Recomienda Mr Clean Sneakers
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        No recomendó en esta ocasión
                      </span>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-dark-950 border-t border-dark-800 flex items-center justify-between text-xs text-slate-400">
          <span>Mostrando {filteredReviews.length} de {totalReviews} reseñas</span>
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
