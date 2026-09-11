import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Clock, MapPin, Phone, User, Package, Plus, Minus, Camera, Trash2, CheckCircle2, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { createPickupRequest, fetchBusinessSettings, fetchProducts, uploadOrderPhoto, generatePickupWhatsAppStoreLink } from '../services/orderService';
import { PickupRequest, Product } from '../types/database';
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
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [references, setReferences] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => {
    // Fecha por defecto: Mañana
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
      const [settings, prods] = await Promise.all([
        fetchBusinessSettings(),
        fetchProducts()
      ]);
      if (settings?.store_phone) {
        setStorePhone(settings.store_phone);
      }
      if (prods && prods.length > 0) {
        setAvailableProducts(prods);
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

      // Abrir WhatsApp automáticamente en una pestaña nueva
      window.open(waLink, '_blank');

    } catch (err: any) {
      console.error('Error al guardar solicitud de colecta:', err);
      alert(err.message || 'Ocurrió un error al agendar la colecta. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Servicios sugeridos por defecto si no hay en base de datos
  const defaultServicesList = availableProducts.length > 0
    ? availableProducts.map(p => p.name)
    : [
        'Limpieza Detallada',
        'Limpieza Básica',
        'Blanqueamiento de Suela',
        'Lavado de Gorra',
        'Restauración / Repintado',
        'Tratamiento Gamuza / Nubuck'
      ];

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
                <span className="font-semibold text-slate-200 text-sm">{submittedPickup.preferred_date}</span>
              </div>
              <div className="bg-dark-950/70 p-3 rounded-xl border border-dark-800">
                <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gold-400" /> Turno / Horario:
                </span>
                <span className="font-semibold text-slate-200 text-sm">{submittedPickup.preferred_time_slot}</span>
              </div>
            </div>

            <div className="bg-dark-950/70 p-3 rounded-xl border border-dark-800 text-xs">
              <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gold-400" /> Dirección de recolección:
              </span>
              <p className="font-medium text-slate-200">{submittedPickup.address}</p>
              {submittedPickup.neighborhood && (
                <p className="text-slate-400 mt-0.5">Colonia: {submittedPickup.neighborhood}</p>
              )}
              {submittedPickup.references && (
                <p className="text-slate-400 italic mt-0.5">Ref: {submittedPickup.references}</p>
              )}
            </div>

            <div className="bg-dark-950/70 p-3 rounded-xl border border-dark-800 text-xs">
              <span className="text-slate-400 block mb-0.5 font-medium flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-gold-400" /> Pares / Artículos ({submittedPickup.item_count}):
              </span>
              {submittedPickup.shoes_details && (
                <p className="font-medium text-slate-200 mt-1">{submittedPickup.shoes_details}</p>
              )}
              {submittedPickup.services && submittedPickup.services.length > 0 && (
                <p className="text-slate-300 mt-1">
                  <span className="text-slate-500">Servicios:</span> {submittedPickup.services.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Botón de Acción Principal para enviar WhatsApp */}
          <div className="space-y-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-extrabold text-slate-950 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-[0_0_25px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-base"
            >
              <WhatsAppIcon className="w-6 h-6 shrink-0 fill-current" />
              <span>Enviar WhatsApp al Negocio</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </a>

            <button
              onClick={() => {
                setSubmittedPickup(null);
                setCustomerName('');
                setCustomerPhone('');
                setAddress('');
                setNeighborhood('');
                setReferences('');
                setItemCount(1);
                setPairs([{ model: '', photos: [] }]);
                setNotes('');
              }}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-dark-900/60 hover:bg-dark-800 border border-dark-800 transition-all text-center"
            >
              Agendar otra colecta
            </button>
          </div>

        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pb-4">
          <p>© {new Date().getFullYear()} Mr Clean Sneakers — Cuidado y Restauración Profesional</p>
        </footer>
      </div>
    );
  }

  // Formulario de Agendado
  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col justify-between selection:bg-gold-500/30 selection:text-gold-200">
      
      {/* Top Banner & Header */}
      <header className="sticky top-0 z-30 bg-dark-900/90 backdrop-blur-md border-b border-gold-500/20 shadow-lg">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-9 h-9 object-contain drop-shadow" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-extrabold text-base tracking-wider bg-gradient-to-r from-gold-300 via-gold-500 to-amber-400 bg-clip-text text-transparent font-serif">
                  MR CLEAN
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-100">
                  SNEAKERS
                </span>
              </div>
              <p className="text-[9px] text-slate-400">Servicio de Colecta a Domicilio</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gold-500/10 text-gold-400 border border-gold-500/30">
            <Sparkles className="w-3 h-3 text-gold-400" />
            Pick-up Express
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-xl mx-auto w-full px-4 py-6 sm:py-8 flex-1">
        
        {/* Intro Hero Box */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dark-900 border border-gold-500/30 text-gold-300 text-xs font-semibold mb-2.5 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-gold-400" />
            <span>Recogemos tus pares en tu puerta</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-serif tracking-tight">
            Agenda tu Recolección
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Completa tus datos para programar la colecta de tus tenis o gorras. Al terminar, te abrirá WhatsApp con el mensaje listo.
          </p>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
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
                <p className="text-[11px] text-slate-500 mt-1">Te contactaremos por este medio para confirmar la llegada.</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Ubicación */}
          <div className="bg-dark-900/80 backdrop-blur-sm rounded-2xl border border-dark-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-2.5">
              <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-200">2. Dirección de Recolección</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Calle y Número <span className="text-gold-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Av. Francisco Villa #3401 (Interior 4B)"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Colonia o Fraccionamiento
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
                    Referencias / Cruces
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Frente al OXXO, portón negro"
                    value={references}
                    onChange={e => setReferences(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Fecha y Horario */}
          <div className="bg-dark-900/80 backdrop-blur-sm rounded-2xl border border-dark-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-2.5">
              <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-200">3. Fecha y Turno Preferido</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Fecha Deseada <span className="text-gold-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Turno de Recolección
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {TIME_SLOTS.map(slot => {
                    const isSelected = preferredTimeSlot.includes(slot.label);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setPreferredTimeSlot(`${slot.label} (${slot.hours})`)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-gold-500/15 border-gold-500 text-gold-300 shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                            : 'bg-dark-950 border-dark-800 text-slate-400 hover:border-dark-700 hover:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                            <span>{slot.icon}</span> {slot.label}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-gold-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{slot.hours}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Pares y Servicios */}
          <div className="bg-dark-900/80 backdrop-blur-sm rounded-2xl border border-dark-800 p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-2.5">
              <Package className="w-4 h-4 text-gold-400 shrink-0" />
              <h2 className="text-sm font-bold text-slate-200">4. Tus Tenis / Artículos</h2>
            </div>

            <div className="space-y-4">
              {/* Cantidad de pares */}
              <div className="flex items-center justify-between bg-dark-950 p-3.5 rounded-xl border border-dark-800">
                <div>
                  <span className="text-sm font-bold text-slate-200 block">Cantidad de Pares / Artículos</span>
                  <span className="text-[11px] text-slate-400">¿Cuántos pares o gorras vas a entregar?</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSetItemCount(itemCount - 1)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 flex items-center justify-center text-slate-200 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-base font-extrabold text-gold-400 w-6 text-center">{itemCount}</span>
                  <button
                    type="button"
                    onClick={() => handleSetItemCount(itemCount + 1)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 border border-dark-700 flex items-center justify-center text-slate-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Servicios requeridos */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Servicios de Interés (puedes seleccionar varios)
                </label>
                <div className="flex flex-wrap gap-2">
                  {defaultServicesList.map(serv => {
                    const active = selectedServices.includes(serv);
                    return (
                      <button
                        key={serv}
                        type="button"
                        onClick={() => handleToggleService(serv)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          active
                            ? 'bg-gold-500/20 border-gold-500/80 text-gold-300 shadow-sm'
                            : 'bg-dark-950 border-dark-800 text-slate-400 hover:border-dark-700 hover:text-slate-300'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}{serv}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalle por cada par / artículo dinámico */}
              <div className="space-y-3.5 pt-2">
                <span className="text-xs font-bold text-slate-300 block">
                  Detalle de cada par / artículo ({pairs.length}):
                </span>

                {pairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="bg-dark-950/90 border border-dark-700/80 rounded-2xl p-4 space-y-3 relative overflow-hidden transition-all shadow-md"
                  >
                    <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                      <span className="text-xs font-bold text-gold-400 flex items-center gap-1.5 font-mono">
                        <Package className="w-3.5 h-3.5 text-gold-400" />
                        {pairs.length === 1 ? 'Par / Artículo #1' : `Par / Artículo #${idx + 1}`}
                      </span>
                      {pairs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (pairs.length > 1) {
                              setPairs(prev => prev.filter((_, i) => i !== idx));
                              setItemCount(prev => Math.max(1, prev - 1));
                            }
                          }}
                          className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Quitar par</span>
                        </button>
                      )}
                    </div>

                    {/* Modelo de este par */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Modelo de este par / artículo <span className="text-slate-500 text-[10px]">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder={
                          idx === 0
                            ? "Ej. Adidas Samba OG Black"
                            : idx === 1
                            ? "Ej. Nike Air Jordan 4 Retro"
                            : idx === 2
                            ? "Ej. Gorra New Era 59FIFTY"
                            : "Ej. Modelo del par..."
                        }
                        value={pair.model}
                        onChange={e => handleUpdatePairModel(idx, e.target.value)}
                        className="w-full bg-dark-900 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                      />
                    </div>

                    {/* Fotos de este par */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-gold-400" />
                          <span>Fotos de este par</span>
                          <span className="text-slate-500 text-[10px]">(opcional)</span>
                        </label>
                        <span className="text-[10px] text-slate-500">Para cotización previa</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {pair.photos.map((url, pIdx) => (
                          <div
                            key={pIdx}
                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-dark-700 bg-dark-900 group"
                          >
                            <img
                              src={url}
                              alt={`Par ${idx + 1} - Foto ${pIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePairPhoto(idx, pIdx)}
                              className="absolute top-0.5 right-0.5 p-1 rounded-full bg-rose-500/90 text-white hover:bg-rose-600 transition-colors shadow"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}

                        {pair.photos.length < 3 && (
                          <label className="w-16 h-16 rounded-xl border border-dashed border-dark-700 hover:border-gold-500/60 bg-dark-900/60 hover:bg-gold-500/5 flex flex-col items-center justify-center cursor-pointer transition-all">
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
                                <Plus className="w-4 h-4 text-slate-400 mb-0.5" />
                                <span className="text-[8px] text-slate-400 font-medium">Subir foto</span>
                              </>
                            )}
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notas adicionales */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notas o indicaciones adicionales (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Tocar el timbre de arriba, avisar 15 mins antes, manchas difíciles de grasa..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all resize-none"
                />
              </div>

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

      </main>

      {/* Simple Footer */}
      <footer className="border-t border-dark-800/80 bg-dark-950/90 py-4 px-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Mr Clean Sneakers — Limpieza y Restauración de Tenis</p>
      </footer>

    </div>
  );
};
