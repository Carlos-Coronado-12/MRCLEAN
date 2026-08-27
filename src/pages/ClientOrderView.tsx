import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchOrderByToken, fetchBusinessSettings, generateWhatsAppLink } from '../services/orderService';
import { Order, OrderStatus } from '../types/database';
import { STATUS_CONFIG, PaymentStatusBadge } from '../components/StatusBadge';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { Crown, Sparkles, Calendar, Clock, CheckCircle2, Package, ShieldCheck, AlertCircle, Image as ImageIcon, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const STATUS_STEPS: { key: OrderStatus; label: string; sub: string }[] = [
  { key: 'received', label: 'RECIBIDO', sub: 'En tienda' },
  { key: 'in_progress', label: 'EN PROCESO', sub: 'Limpieza en curso' },
  { key: 'ready', label: 'LISTO', sub: 'Para entrega' },
  { key: 'delivered', label: 'ENTREGADO', sub: 'Servicio concluido' },
];

export const ClientOrderView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [storePhone, setStorePhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadOrder(token);
    }
  }, [token]);

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
              {order.status === 'delivered' && 'Gracias por tu confianza. ¡Esperamos verte pronto! 🤝'}
              {order.status === 'cancelled' && 'Este pedido fue cancelado.'}
            </p>
          </div>

          {/* Contact Store WhatsApp Button */}
          <a
            href={generateWhatsAppLink(order, 'contact_store', storePhone || undefined)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
          >
            <WhatsAppIcon className="w-4 h-4 fill-slate-950" />
            Contactar a la Tienda
          </a>
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
          <div className="border-t border-dark-700 pt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Monto Total del Servicio</span>
            <span className="text-2xl font-black text-gold-400 font-mono">${order.total_amount.toFixed(2)} MXN</span>
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
