import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Calendar, Clock, MapPin, Phone, User, Package, Plus, Minus, Camera, 
  Trash2, CheckCircle2, ShieldCheck, ArrowRight, RefreshCw, Tag, Flame, Percent,
  Star, Award, ZoomIn, X, Sliders, ChevronRight, Check, Eye, ChevronLeft, CheckCircle,
  MessageSquare, ArrowUp, ThumbsUp, Heart
} from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { 
  createPickupRequest, fetchBusinessSettings, fetchProducts, fetchPromotions, 
  uploadOrderPhoto, generatePickupWhatsAppStoreLink, fetchPortfolioItems, fetchReviews 
} from '../services/orderService';
import { PickupRequest, Product, Promotion, PortfolioItem, Review } from '../types/database';
import confetti from 'canvas-confetti';

const TIME_SLOTS = [
  { id: 'morning', label: 'Mañana', hours: '9:00 AM - 1:00 PM', icon: '☀️' },
  { id: 'afternoon', label: 'Tarde', hours: '2:00 PM - 7:00 PM', icon: '🌆' },
  { id: 'flexible', label: 'Horario Flexible', hours: 'A convenir por WhatsApp', icon: '⚡' },
];

interface PickupPairItem {
  model: string;
  photos: string[];
}

export const SchedulePickupPage: React.FC = () => {
  const [storePhone, setStorePhone] = useState<string>('6147324931');
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [featuredReviews, setFeaturedReviews] = useState<Review[]>([]);
  const [portfolioCategory, setPortfolioCategory] = useState<string>('all');
  const [lightboxItem, setLightboxItem] = useState<PortfolioItem | null>(null);
  const [lightboxSliderPos, setLightboxSliderPos] = useState<number>(50);
  const [cardSliderPositions, setCardSliderPositions] = useState<Record<string, number>>({});
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [references, setReferences] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Mañana (9:00 AM - 1:00 PM)');
  const [itemCount, setItemCount] = useState(1);
  const [selectedServices, setSelectedServices] = useState<string[]>(['Limpieza Detallada']);
  const [pairs, setPairs] = useState<PickupPairItem[]>([
    { model: '', photos: [] }
  ]);
  const [notes, setNotes] = useState('');
  
  // UI & Submission state
  const [uploadingPairIndex, setUploadingPairIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPickup, setSubmittedPickup] = useState<PickupRequest | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      const [settings, prods, promos, port, revs] = await Promise.all([
        fetchBusinessSettings(),
        fetchProducts(),
        fetchPromotions(),
        fetchPortfolioItems(true),
        fetchReviews(true, true)
      ]);

      if (settings?.store_phone) {
        setStorePhone(settings.store_phone);
      }
      if (prods && prods.length > 0) {
        setAvailableProducts(prods);
      }
      if (promos && promos.length > 0) {
        setPromotions(promos.filter(p => p.is_active));
      }
      if (port && port.length > 0) {
        setPortfolio(port.filter(p => p.is_active));
      }
      if (revs && revs.length > 0) {
        setFeaturedReviews(revs);
      } else {
        // Fallback: cargar todas las publicadas si no hay marcadas como destacadas aún
        const allPublished = await fetchReviews(true, false);
        setFeaturedReviews(allPublished.slice(0, 6));
      }
    } catch (e) {
      console.error('Error cargando datos de la tienda:', e);
    }
  };

  const handleToggleService = (serviceName: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  const handleSetItemCount = (newCount: number) => {
    const target = Math.max(1, Math.min(15, newCount));
    setItemCount(target);
    setPairs(prev => {
      if (target > prev.length) {
        const added: PickupPairItem[] = Array.from({ length: target - prev.length }, () => ({
          model: '',
          photos: []
        }));
        return [...prev, ...added];
      } else {
        return prev.slice(0, target);
      }
    });
  };

  const handleUpdatePairModel = (pairIndex: number, model: string) => {
    setPairs(prev => {
      const updated = [...prev];
      updated[pairIndex] = { ...updated[pairIndex], model };
      return updated;
    });
  };

  const handlePairPhotoUpload = async (pairIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPairIndex(pairIndex);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const url = await uploadOrderPhoto(file);
        newUrls.push(url);
      }
      setPairs(prev => {
        const updated = [...prev];
        updated[pairIndex] = {
          ...updated[pairIndex],
          photos: [...updated[pairIndex].photos, ...newUrls]
        };
        return updated;
      });
    } catch (err) {
      console.error('Error al subir foto:', err);
      alert('No se pudo subir la foto. Intenta de nuevo.');
    } finally {
      setUploadingPairIndex(null);
      e.target.value = '';
    }
  };

  const handleRemovePairPhoto = (pairIndex: number, photoIndex: number) => {
    setPairs(prev => {
      const updated = [...prev];
      updated[pairIndex] = {
        ...updated[pairIndex],
        photos: updated[pairIndex].photos.filter((_, idx) => idx !== photoIndex)
      };
      return updated;
    });
  };

  const handleSelectFromShowcase = (item: PortfolioItem) => {
    if (item.service_name) {
      if (!selectedServices.includes(item.service_name)) {
        setSelectedServices(prev => [...prev, item.service_name!]);
      }
    }
    if (pairs.length > 0 && !pairs[0].model.trim()) {
      handleUpdatePairModel(0, item.title);
    }
    const formElement = document.getElementById('booking-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCardSliderChange = (itemId: string, pos: number) => {
    setCardSliderPositions(prev => ({ ...prev, [itemId]: pos }));
  };

  const scrollToReferences = () => {
    const el = document.getElementById('referencias');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToForm = () => {
    const el = document.getElementById('booking-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Por favor escribe tu nombre completo.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 8) {
      alert('Por favor escribe tu número de WhatsApp válido.');
      return;
    }
    if (!address.trim()) {
      alert('Por favor escribe tu dirección de recolección (calle y número).');
      return;
    }
    if (!preferredDate) {
      alert('Por favor selecciona la fecha deseada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const aggregatedShoesDetails = pairs
        .map((p, idx) => p.model.trim() ? `Par #${idx + 1}: ${p.model.trim()}` : `Par #${idx + 1}`)
        .join(' | ');

      const allPhotos = pairs.flatMap(p => p.photos);

      const created = await createPickupRequest({
        customer_name: customerName,
        customer_phone: customerPhone,
        address: address,
        neighborhood: neighborhood,
        references: references,
        preferred_date: preferredDate,
        preferred_time_slot: preferredTimeSlot,
        item_count: pairs.length,
        services: selectedServices,
        shoes_details: aggregatedShoesDetails,
        notes: notes,
        photos: allPhotos,
        status: 'pending'
      });

      const waLink = generatePickupWhatsAppStoreLink(created, storePhone);
      setSubmittedPickup(created);
      setWhatsappUrl(waLink);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F5ECC6', '#FFFFFF', '#38BDF8', '#10B981']
      });

      window.open(waLink, '_blank');

    } catch (err: any) {
      console.error('Error al guardar solicitud de colecta:', err);
      alert(err.message || 'Ocurrió un error al agendar la colecta. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pantalla de confirmación de éxito
  if (submittedPickup) {
    return (
      <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-gold-500/30 selection:text-gold-200">
        <div className="max-w-xl mx-auto w-full pt-4 pb-12">
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 mb-3 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-serif tracking-tight">
              ¡Solicitud de Colecta Registrada!
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Tu folio asignado es <span className="font-bold text-gold-400">#{submittedPickup.request_number}</span>
            </p>
          </div>

          {/* Card Resumen */}
          <div className="bg-dark-900/90 backdrop-blur-md rounded-2xl border border-gold-500/30 p-5 sm:p-6 shadow-2xl space-y-4 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="border-b border-dark-700 pb-3">
              <span className="text-xs uppercase tracking-wider text-gold-400 font-bold block mb-1">
                Resumen de tu Cita
              </span>
              <p className="text-lg font-bold text-slate-100">{submittedPickup.customer_name}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-gold-400" />
                {submittedPickup.customer_phone}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-dark-950/70 p-3 rounded-xl border border-dark-800">
                <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" /> Fecha solicitada:
                </span>
                <span className="font-bold text-slate-200">
                  {new Date(submittedPickup.preferred_date + 'T00:00:00').toLocaleDateString('es-MX', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </span>
              </div>

              <div className="bg-dark-950/70 p-3 rounded-xl border border-dark-800">
                <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gold-400" /> Horario:
                </span>
                <span className="font-bold text-slate-200">
                  {submittedPickup.preferred_time_slot}
                </span>
              </div>

              <div className="bg-dark-950/70 p-3 rounded-xl border border-dark-800 sm:col-span-2">
                <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gold-400" /> Dirección:
                </span>
                <span className="font-semibold text-slate-200 block">
                  {submittedPickup.address}
                </span>
                {submittedPickup.neighborhood && (
                  <span className="text-slate-400 text-[11px] block">
                    Col. {submittedPickup.neighborhood}
                  </span>
                )}
                {submittedPickup.references && (
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    Ref: {submittedPickup.references}
                  </span>
                )}
              </div>

              <div className="bg-dark-950/70 p-3 rounded-xl border border-dark-800 sm:col-span-2">
                <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-gold-400" /> Artículos ({submittedPickup.item_count} par{submittedPickup.item_count > 1 ? 'es' : ''}):
                </span>
                <p className="font-semibold text-slate-200">
                  {submittedPickup.shoes_details || `${submittedPickup.item_count} pares`}
                </p>
                {submittedPickup.services && submittedPickup.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {submittedPickup.services.map((srv, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 rounded text-[10px] bg-gold-500/15 text-gold-300 border border-gold-500/30">
                        {srv}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botón WhatsApp */}
          <div className="space-y-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-extrabold text-dark-950 bg-emerald-400 hover:bg-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              <WhatsAppIcon className="w-5 h-5 fill-dark-950" />
              <span>Abrir WhatsApp con mi Solicitud</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => {
                setSubmittedPickup(null);
                setPairs([{ model: '', photos: [] }]);
                setCustomerName('');
                setCustomerPhone('');
                setAddress('');
                setNeighborhood('');
                setReferences('');
                setNotes('');
              }}
              className="w-full py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-dark-900/60 hover:bg-dark-900 border border-dark-800 transition-colors"
            >
              Agendar otra recolección
            </button>
          </div>

        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-4 border-t border-dark-900">
          <p>© {new Date().getFullYear()} Mr Clean Sneakers — Limpieza & Restauración</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 selection:bg-gold-500/30 selection:text-gold-200 flex flex-col">
      
      {/* Top Header */}
      <header className="bg-dark-900/90 backdrop-blur-md border-b border-gold-500/20 py-3.5 px-4 sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400 bg-clip-text text-transparent font-serif">
                MR CLEAN
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-100 ml-1">
                SNEAKERS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollToReferences}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-dark-950 text-gold-400 border border-gold-500/30 hover:border-gold-400 transition-colors"
            >
              <Star className="w-3 h-3 fill-gold-400" />
              <span>Referencias</span>
            </button>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gold-500/10 text-gold-400 border border-gold-500/30">
              <Sparkles className="w-3 h-3 text-gold-400" />
              Colectas
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto w-full px-4 py-6 sm:py-8 flex-1 space-y-8">
        
        {/* Intro Hero Box */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-900 border border-gold-500/30 text-gold-300 text-xs font-semibold shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-gold-400" />
            <span>Recogemos tus pares directamente en tu puerta</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-serif tracking-tight">
            Agenda tu Recolección
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Completa tus datos para programar la colecta de tus tenis o gorras. Al terminar, te abrirá WhatsApp con el mensaje listo.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={scrollToReferences}
              className="text-[11px] text-gold-400 hover:text-gold-300 font-semibold inline-flex items-center gap-1 underline underline-offset-4"
            >
              <Star className="w-3 h-3 fill-gold-400" />
              Ver fotos de trabajos reales y reseñas de clientes ↓
            </button>
          </div>
        </div>

        {/* Banner de Promociones Activas */}
        {promotions.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gold-400 uppercase tracking-wider px-1">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Promociones Especiales Disponibles</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {promotions.map(promo => (
                <div
                  key={promo.id || promo.title}
                  className="bg-gradient-to-r from-dark-900 via-dark-900/90 to-dark-950 border border-gold-500/40 rounded-2xl p-3.5 sm:p-4 shadow-lg flex items-center justify-between gap-3 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-gold-500/10 transition-colors" />
                  
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-amber-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shrink-0">
                      {promo.promo_type === 'bulk_pairs' ? (
                        <Package className="w-5 h-5" />
                      ) : promo.promo_type === 'percentage_discount' ? (
                        <Percent className="w-5 h-5" />
                      ) : (
                        <Tag className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{promo.title}</span>
                        {promo.highlight_badge && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-gradient-to-r from-amber-500 to-gold-500 text-dark-950 uppercase tracking-wider">
                            {promo.highlight_badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {promo.description || (
                          promo.promo_type === 'bulk_pairs'
                            ? `A partir de ${promo.min_pairs} pares pagan sólo $${promo.special_price_per_pair} c/u`
                            : promo.promo_type === 'percentage_discount'
                            ? `${promo.discount_value}% de descuento`
                            : `Paquete especial por $${promo.package_price}`
                        )}
                      </p>
                    </div>
                  </div>

                  {promo.promo_type === 'bulk_pairs' && (
                    <button
                      type="button"
                      onClick={() => handleSetItemCount(promo.min_pairs || 5)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border border-gold-500/40 transition-all shrink-0 active:scale-95"
                    >
                      Pedir {promo.min_pairs} pares
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Booking Form */}
        <form id="booking-form" onSubmit={handleSubmit} className="space-y-5">
          
          {/* SECCIÓN 1: Contacto */}
          <div className="bg-dark-900/80 backdrop-blur-sm rounded-2xl border border-dark-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-2.5">
              <User className="w-4 h-4 text-gold-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-200">1. Tus Datos de Contacto</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tu Nombre Completo <span className="text-gold-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Carlos Mendoza"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Número de WhatsApp <span className="text-gold-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                    <WhatsAppIcon className="w-4 h-4 fill-current" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 614 123 4567"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Dónde y Cuándo */}
          <div className="bg-dark-900/80 backdrop-blur-sm rounded-2xl border border-dark-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-2.5">
              <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-200">2. Dónde y Cuándo Pasamos</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dirección completa (Calle y Número) <span className="text-gold-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Av. Universidad #1420"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Colonia / Sector
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. San Felipe"
                    value={neighborhood}
                    onChange={e => setNeighborhood(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Referencias de entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Casa blanca con reja negra"
                    value={references}
                    onChange={e => setReferences(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Fecha y Horario */}
              <div className="pt-1 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Día deseado de recolección <span className="text-gold-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={e => setPreferredDate(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Horario preferido
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {TIME_SLOTS.map(slot => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setPreferredTimeSlot(`${slot.label} (${slot.hours})`)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          preferredTimeSlot.startsWith(slot.label)
                            ? 'bg-gold-500/15 border-gold-400 text-gold-300 shadow-sm'
                            : 'bg-dark-950 border-dark-800 text-slate-400 hover:border-dark-700'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{slot.icon}</span>
                          <span>{slot.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{slot.hours}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* SECCIÓN 3: Pares y Servicios */}
          <div className="bg-dark-900/80 backdrop-blur-sm rounded-2xl border border-dark-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-dark-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gold-400 shrink-0" />
                <h2 className="text-sm font-bold text-slate-200">3. ¿Cuántos Pares Vas a Entregar?</h2>
              </div>

              {/* Selector de cantidad */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetItemCount(pairs.length - 1)}
                  className="w-8 h-8 rounded-lg bg-dark-950 border border-dark-700 hover:border-gold-500/50 flex items-center justify-center text-slate-300 font-bold transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-extrabold text-base text-gold-400 px-2 min-w-[2rem] text-center">
                  {pairs.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleSetItemCount(pairs.length + 1)}
                  className="w-8 h-8 rounded-lg bg-dark-950 border border-dark-700 hover:border-gold-500/50 flex items-center justify-center text-slate-300 font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Servicios deseados */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Servicios que te interesan para estos pares:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(availableProducts.length > 0 ? availableProducts.map(p => p.name) : [
                  'Limpieza Detallada',
                  'Limpieza Básica',
                  'Blanqueamiento de Suela',
                  'Lavado de Gorra',
                  'Restauración / Repintado',
                  'Tratamiento Gamuza'
                ]).map(srv => {
                  const isChecked = selectedServices.includes(srv);
                  return (
                    <button
                      key={srv}
                      type="button"
                      onClick={() => handleToggleService(srv)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${
                        isChecked
                          ? 'bg-gold-500/20 border-gold-400 text-gold-300 font-bold'
                          : 'bg-dark-950 border-dark-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '} {srv}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pares individuales */}
            <div className="space-y-3 pt-1">
              {pairs.map((pair, idx) => (
                <div key={idx} className="bg-dark-950/70 border border-dark-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gold-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-400 text-[11px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      Par #{idx + 1}
                    </span>
                    {pairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPairs(prev => prev.filter((_, pIdx) => pIdx !== idx));
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 text-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Modelo o tipo de tenis <span className="text-slate-600">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Nike Dunk Low, Jordan 1, Adidas Samba..."
                      value={pair.model}
                      onChange={e => handleUpdatePairModel(idx, e.target.value)}
                      className="w-full bg-dark-900 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  {/* Fotos del par */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Camera className="w-3 h-3 text-gold-400" />
                        <span>Foto previa</span>
                        <span className="text-slate-600">(opcional)</span>
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {pair.photos.map((url, pIdx) => (
                        <div key={pIdx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-dark-700 bg-dark-900">
                          <img src={url} alt={`Par ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePairPhoto(idx, pIdx)}
                            className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-rose-500 text-white"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}

                      {pair.photos.length < 3 && (
                        <label className="w-14 h-14 rounded-lg border border-dashed border-dark-700 hover:border-gold-500/50 bg-dark-900/50 flex flex-col items-center justify-center cursor-pointer transition-all">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={e => handlePairPhotoUpload(idx, e)}
                            disabled={uploadingPairIndex === idx}
                          />
                          {uploadingPairIndex === idx ? (
                            <RefreshCw className="w-4 h-4 text-gold-400 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4 text-slate-400" />
                              <span className="text-[8px] text-slate-400">Foto</span>
                            </>
                          )}
                        </label>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Instrucciones o notas adicionales (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ej. Tocar timbre de arriba, manchas difíciles en la suela..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 outline-none transition-all resize-none"
              />
            </div>

          </div>

          {/* Botón de Envío */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-extrabold text-slate-950 bg-gradient-to-r from-gold-300 via-gold-400 to-amber-400 hover:from-gold-200 hover:to-amber-300 shadow-[0_0_30px_rgba(212,175,55,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Procesando Solicitud...</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon className="w-5 h-5 fill-current" />
                  <span>Agendar y Enviar por WhatsApp</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-500 mt-2 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Tus datos están protegidos y solo se usarán para coordinar tu servicio.
            </p>
          </div>

        </form>

        {/* ========================================================= */}
        {/* APARTADO DE REFERENCIAS: GALERÍA ANTES/DESPUÉS Y RESEÑAS */}
        {/* ========================================================= */}
        <section
          id="referencias"
          className="scroll-mt-6 bg-gradient-to-b from-dark-900 via-dark-900 to-dark-950 border-2 border-gold-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Decorative Glows */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header de la Sección de Referencias */}
          <div className="text-center space-y-2 border-b border-dark-800 pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs font-bold tracking-wider uppercase">
              <Award className="w-3.5 h-3.5" />
              Referencias & Calidad Mr Clean
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-serif">
              Evidencia Real y Opiniones de Clientes
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              Comprueba los resultados de nuestros trabajos de restauración y las calificaciones de quienes ya confían en nosotros.
            </p>
          </div>

          {/* 1. GALERÍA DE TRABAJOS (ANTES Y DESPUÉS) */}
          {portfolio.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gold-400" />
                  <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                    Galería Antes y Después
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">Desliza para comparar</span>
              </div>

              {/* Filtros de categorías de la galería */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setPortfolioCategory('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                    portfolioCategory === 'all'
                      ? 'bg-gold-500 text-dark-950 shadow-gold-glow-sm'
                      : 'bg-dark-950 text-slate-400 hover:text-slate-200 border border-dark-700'
                  }`}
                >
                  Todos ({portfolio.length})
                </button>
                {Array.from(new Set(portfolio.map(p => p.category))).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPortfolioCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                      portfolioCategory === cat
                        ? 'bg-gold-500 text-dark-950 shadow-gold-glow-sm'
                        : 'bg-dark-950 text-slate-400 hover:text-slate-200 border border-dark-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Grid de Trabajos con Sliders Antes/Después */}
              <div className="grid grid-cols-1 gap-4">
                {portfolio
                  .filter(item => portfolioCategory === 'all' || item.category === portfolioCategory)
                  .map(item => {
                    const itemId = item.id || item.title;
                    const sliderPos = cardSliderPositions[itemId] !== undefined ? cardSliderPositions[itemId] : 50;
                    const hasBoth = Boolean(item.before_photo && item.after_photo);

                    return (
                      <div
                        key={itemId}
                        className="bg-dark-950/80 rounded-2xl border border-dark-800 hover:border-gold-500/40 shadow-xl overflow-hidden transition-all group"
                      >
                        {/* Visualizador Slider Antes/Después */}
                        <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-dark-950 select-none overflow-hidden">
                          {hasBoth ? (
                            <>
                              {/* Fondo blur */}
                              <img
                                src={item.after_photo}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-110 pointer-events-none"
                              />

                              {/* Imagen DESPUÉS */}
                              <img
                                src={item.after_photo}
                                alt={`Después - ${item.title}`}
                                className="absolute inset-0 w-full h-full object-contain p-2"
                              />
                              <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/90 text-white shadow pointer-events-none">
                                DESPUÉS
                              </div>

                              {/* Imagen ANTES */}
                              <img
                                src={item.before_photo!}
                                alt={`Antes - ${item.title}`}
                                className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none"
                                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                              />
                              <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/90 text-white shadow pointer-events-none">
                                ANTES
                              </div>

                              {/* Manija central */}
                              <div
                                className="absolute inset-y-0 w-0.5 bg-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.9)] pointer-events-none z-10"
                                style={{ left: `${sliderPos}%` }}
                              >
                                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gold-400 border-2 border-dark-950 flex items-center justify-center text-dark-950 shadow-xl">
                                  <Sliders className="w-3.5 h-3.5 rotate-90" />
                                </div>
                              </div>

                              {/* Input range */}
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={sliderPos}
                                onChange={e => handleCardSliderChange(itemId, Number(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                                title="Arrastra para comparar el antes y después"
                              />
                            </>
                          ) : (
                            <>
                              <img
                                src={item.after_photo}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-110 pointer-events-none"
                              />
                              <img
                                src={item.after_photo}
                                alt={item.title}
                                className="relative w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/90 text-white shadow">
                                RESULTADO FINAL
                              </div>
                            </>
                          )}

                          {/* Botón de Zoom */}
                          <button
                            type="button"
                            onClick={() => {
                              setLightboxItem(item);
                              setLightboxSliderPos(sliderPos);
                            }}
                            className="absolute bottom-3 right-3 z-20 p-2 rounded-xl bg-dark-950/80 hover:bg-dark-950 text-slate-200 border border-dark-700 hover:border-gold-500/50 backdrop-blur-sm shadow-md transition-all flex items-center gap-1 text-[11px] font-semibold"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-gold-400" />
                            <span className="hidden sm:inline">Ampliar</span>
                          </button>
                        </div>

                        {/* Ficha descriptiva y CTA */}
                        <div className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-gold-500/15 text-gold-300 border border-gold-500/30">
                                  {item.category}
                                </span>
                                {item.is_featured && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 fill-amber-300" /> Destacado
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm sm:text-base font-bold text-slate-100">{item.title}</h4>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectFromShowcase(item)}
                              className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-gold-500/20 to-amber-500/20 hover:from-gold-500 hover:to-amber-500 text-gold-300 hover:text-dark-950 border border-gold-500/40 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                              <span>Pedir este servicio</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {item.service_name && (
                            <p className="text-xs text-gold-400 font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              <span>Servicio: {item.service_name}</span>
                            </p>
                          )}

                          {item.description && (
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2. RESEÑAS Y TESTIMONIOS DESTACADOS */}
          {featuredReviews.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-dark-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-gold-400 fill-gold-400" />
                  <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                    Opiniones Destacadas de Clientes
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-gold-400 font-bold bg-dark-950 px-2.5 py-1 rounded-lg border border-dark-700">
                  <Star className="w-3.5 h-3.5 fill-gold-400" />
                  <span>5.0 / 5.0</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {featuredReviews.map((rev, rIdx) => (
                  <div
                    key={rev.id || rIdx}
                    className="bg-dark-950/90 border border-dark-800 hover:border-gold-500/30 rounded-2xl p-4 space-y-2.5 shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-dark-800/60 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gold-500/20 text-gold-300 font-bold text-xs flex items-center justify-center border border-gold-500/30">
                            {rev.customer_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">{rev.customer_name}</p>
                            <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Cliente Verificado
                            </span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex text-gold-400">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${rev.rating >= star ? 'fill-gold-400 text-gold-400' : 'text-dark-700'}`}
                            />
                          ))}
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-300 italic leading-relaxed">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>

                    {rev.service_aspects && rev.service_aspects.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rev.service_aspects.map((aspect, aIdx) => (
                          <span
                            key={aIdx}
                            className="text-[9px] font-medium px-2 py-0.5 rounded bg-gold-500/10 text-gold-300 border border-gold-500/20"
                          >
                            ✓ {aspect}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón para volver arriba al formulario */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500/15 hover:bg-gold-500/25 text-gold-300 border border-gold-500/30 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Subir y Agendar mi Colecta</span>
            </button>
          </div>

        </section>

      </main>

      {/* Simple Footer */}
      <footer className="border-t border-dark-800/80 bg-dark-950/90 py-5 px-4 text-center text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-400">Mr Clean Sneakers — Limpieza y Restauración Especializada</p>
        <p>© {new Date().getFullYear()} Todos los derechos reservados.</p>
      </footer>

      {/* MODAL LIGHTBOX DE EVIDENCIA EN ALTA RESOLUCIÓN */}
      {lightboxItem && (
        <div className="fixed inset-0 z-50 bg-dark-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-dark-900 border border-gold-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Lightbox Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-dark-800 bg-gradient-to-r from-dark-900 via-dark-900 to-dark-950">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gold-500/15 text-gold-300 border border-gold-500/30">
                  {lightboxItem.category}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-100">{lightboxItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-dark-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Media Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              
              <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[65vh] rounded-2xl overflow-hidden border border-dark-700 bg-dark-950 select-none shadow-2xl">
                {lightboxItem.before_photo ? (
                  <>
                    <img
                      src={lightboxItem.after_photo}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-110 pointer-events-none"
                    />

                    <img
                      src={lightboxItem.after_photo}
                      alt="Después"
                      className="absolute inset-0 w-full h-full object-contain p-3"
                    />
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-500/90 text-white shadow">
                      DESPUÉS
                    </div>

                    <img
                      src={lightboxItem.before_photo}
                      alt="Antes"
                      className="absolute inset-0 w-full h-full object-contain p-3 pointer-events-none"
                      style={{ clipPath: `inset(0 ${100 - lightboxSliderPos}% 0 0)` }}
                    />
                    <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md text-xs font-extrabold bg-rose-500/90 text-white shadow pointer-events-none">
                      ANTES
                    </div>

                    <div
                      className="absolute inset-y-0 w-0.5 bg-gold-400 shadow-[0_0_25px_rgba(212,175,55,0.9)] pointer-events-none z-10"
                      style={{ left: `${lightboxSliderPos}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-gold-400 border-2 border-dark-950 flex items-center justify-center text-dark-950 shadow-2xl">
                        <Sliders className="w-4 h-4 rotate-90" />
                      </div>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={lightboxSliderPos}
                      onChange={e => setLightboxSliderPos(Number(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                    />
                  </>
                ) : (
                  <>
                    <img
                      src={lightboxItem.after_photo}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-25 scale-110 pointer-events-none"
                    />
                    <img
                      src={lightboxItem.after_photo}
                      alt={lightboxItem.title}
                      className="relative w-full h-full object-contain p-3"
                    />
                  </>
                )}
              </div>

              {/* Info y botón de agendado */}
              <div className="bg-dark-950 rounded-2xl p-4 border border-dark-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  {lightboxItem.service_name && (
                    <p className="text-xs font-bold text-gold-400 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> {lightboxItem.service_name}
                    </p>
                  )}
                  {lightboxItem.description && (
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                      {lightboxItem.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectFromShowcase(lightboxItem);
                    setLightboxItem(null);
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-xs text-dark-950 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Quiero este resultado en mis tenis</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
