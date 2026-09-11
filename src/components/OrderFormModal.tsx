import React, { useState, useEffect } from 'react';
import { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, Customer, Product, PickupRequest, Promotion } from '../types/database';
import { saveOrder, uploadOrderPhoto, fetchCustomers, fetchProducts, fetchPromotions } from '../services/orderService';
import { X, Plus, Trash2, Camera, Upload, Loader2, Sparkles, UserCheck, ChevronDown, Tag, Flame, Percent, RotateCcw, Check, Gift, DollarSign } from 'lucide-react';

interface OrderFormModalProps {
  orderToEdit?: Order | null;
  prefillPickup?: PickupRequest | null;
  onClose: () => void;
  onSuccess: (savedOrder: Order) => void;
}

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

export const MAIN_SERVICES: ServiceItem[] = [
  { id: 'Limpieza Sencilla', name: 'Limpieza Sencilla', price: 150 },
  { id: 'Limpieza Detallada', name: 'Limpieza Detallada', price: 200 },
  { id: 'Gorra', name: 'Gorra', price: 150 },
];

export const EXTRA_WHITENING_PRICE = 50;

interface ExtendedOrderItem extends Partial<OrderItem> {
  base_service?: string;
  has_whitening?: boolean;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  orderToEdit,
  prefillPickup,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(orderToEdit);

  const [customerName, setCustomerName] = useState(
    orderToEdit?.customer_name || prefillPickup?.customer_name || ''
  );
  const [customerPhone, setCustomerPhone] = useState(
    orderToEdit?.customer_phone || prefillPickup?.customer_phone || '52'
  );
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [receptionDate, setReceptionDate] = useState(
    orderToEdit?.reception_date 
      ? new Date(orderToEdit.reception_date).toISOString().slice(0, 16) 
      : new Date().toISOString().slice(0, 16)
  );
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    orderToEdit?.estimated_delivery_date || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<OrderStatus>(orderToEdit?.status || 'received');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(orderToEdit?.payment_method || 'pending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(orderToEdit?.payment_status || 'pending');
  const [paidAmount, setPaidAmount] = useState<string>(
    orderToEdit?.paid_amount !== undefined 
      ? String(orderToEdit.paid_amount) 
      : orderToEdit?.payment_status === 'paid' 
      ? String(orderToEdit.total_amount || 0) 
      : '0'
  );
  const [notes, setNotes] = useState(() => {
    if (orderToEdit?.notes) return orderToEdit.notes;
    if (prefillPickup) {
      const parts = [
        `[Colecta #${prefillPickup.request_number || 'COL'}]`,
        `📍 Dirección: ${prefillPickup.address}${prefillPickup.neighborhood ? `, Col. ${prefillPickup.neighborhood}` : ''}${prefillPickup.references ? ` (Ref: ${prefillPickup.references})` : ''}`,
      ];
      if (prefillPickup.notes) parts.push(`Notas: ${prefillPickup.notes}`);
      return parts.join('\n');
    }
    return '';
  });

  const [availableServices, setAvailableServices] = useState<ServiceItem[]>(MAIN_SERVICES);
  const [activePromotions, setActivePromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    fetchCustomers().then(data => setCustomersList(data)).catch(() => {});
    fetchProducts().then(prods => {
      if (prods && prods.length > 0) {
        const mapped: ServiceItem[] = prods.map(p => ({
          id: p.id || p.name,
          name: p.name,
          price: p.price
        }));
        setAvailableServices(mapped);
      }
    }).catch(() => {});
    fetchPromotions().then(promos => {
      setActivePromotions(promos.filter(p => p.is_active));
    }).catch(() => {});
  }, []);

  // Helper para inicializar un ítem detectando base_service y has_whitening
  const parseOrderItem = (item?: ExtendedOrderItem): ExtendedOrderItem => {
    const sName = item?.service_name || 'Limpieza Sencilla';

    // Encontrar base service
    let base: string = MAIN_SERVICES[0].name;
    if (/sencilla/i.test(sName)) base = 'Limpieza Sencilla';
    else if (/detallada|profunda/i.test(sName)) base = 'Limpieza Detallada';
    else if (/gorra/i.test(sName)) base = 'Gorra';
    else if (item?.base_service) base = item.base_service;
    else base = sName.replace(/\s*\+\s*blanqueamiento de suela/i, '').trim() || 'Limpieza Sencilla';

    const hasWhitening = base === 'Gorra' ? false : Boolean(
      item?.has_whitening ?? /blanqueamiento/i.test(sName)
    );

    return {
      brand_model: item?.brand_model || '',
      service_name: base === 'Gorra' ? 'Gorra' : sName,
      base_service: base,
      has_whitening: hasWhitening,
      price: item?.price !== undefined ? Number(item.price) : 150,
      before_photos: item?.before_photos || [],
      after_photos: item?.after_photos || []
    };
  };

  // Sneakers items array
  const [items, setItems] = useState<ExtendedOrderItem[]>(() => {
    if (orderToEdit?.order_items && orderToEdit.order_items.length > 0) {
      return orderToEdit.order_items.map(it => parseOrderItem(it));
    }
    if (prefillPickup) {
      const initialItems: ExtendedOrderItem[] = [];
      const count = Math.max(1, prefillPickup.item_count || 1);
      const serviceName = prefillPickup.services && prefillPickup.services[0] 
        ? prefillPickup.services[0] 
        : 'Limpieza Detallada';
      
      for (let i = 0; i < count; i++) {
        initialItems.push(parseOrderItem({
          brand_model: i === 0 && prefillPickup.shoes_details ? prefillPickup.shoes_details : '',
          service_name: serviceName,
          price: 200,
          before_photos: i === 0 && prefillPickup.photos ? prefillPickup.photos : []
        }));
      }
      return initialItems;
    }
    return [parseOrderItem({ service_name: 'Limpieza Sencilla', price: 150 })];
  });

  const [uploadingIndex, setUploadingIndex] = useState<{ index: number; type: 'before' | 'after' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate Total Amount and Payment Breakdown
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const numericPaidAmount = paymentStatus === 'paid'
    ? totalAmount
    : paymentStatus === 'pending'
    ? 0
    : Math.max(0, Number(paidAmount) || 0);
  const remainingBalance = Math.max(0, totalAmount - numericPaidAmount);

  const handlePaymentStatusChange = (newStatus: PaymentStatus) => {
    setPaymentStatus(newStatus);
    if (newStatus === 'paid') {
      setPaidAmount(String(totalAmount));
    } else if (newStatus === 'pending') {
      setPaidAmount('0');
    } else if (newStatus === 'partial') {
      const current = Number(paidAmount) || 0;
      if (current === 0 || current >= totalAmount) {
        setPaidAmount(String(Math.round(totalAmount / 2)));
      }
    }
  };

  // Estado de promoción aplicada
  const [appliedPromo, setAppliedPromo] = useState<{
    id?: string;
    title: string;
    details: string;
    type: string;
  } | null>(null);

  // Estado para descuento manual / personalizado
  const [showCustomDiscount, setShowCustomDiscount] = useState(false);
  const [customDiscountType, setCustomDiscountType] = useState<'percent' | 'fixed'>('fixed');
  const [customDiscountValue, setCustomDiscountValue] = useState<string>('');

  // Helper para obtener precio estándar según servicio
  const getStandardBasePrice = (baseService?: string) => {
    const sName = baseService || 'Limpieza Sencilla';
    const match = availableServices.find(s => s.name === sName) || MAIN_SERVICES.find(s => s.name === sName);
    return match ? match.price : (sName === 'Limpieza Detallada' ? 200 : 150);
  };

  // Restaurar precios estándar sin promoción
  const handleResetPrices = () => {
    const restored = items.map(item => {
      const base = getStandardBasePrice(item.base_service);
      return {
        ...item,
        price: base + (item.has_whitening ? EXTRA_WHITENING_PRICE : 0)
      };
    });
    setItems(restored);
    setAppliedPromo(null);
  };

  // Aplicar promoción específica
  const handleApplyPromotion = (promo: Promotion) => {
    if (promo.promo_type === 'bulk_pairs') {
      const specialBase = promo.special_price_per_pair ?? 100;
      const updated = items.map(item => ({
        ...item,
        price: specialBase + (item.has_whitening ? EXTRA_WHITENING_PRICE : 0)
      }));
      setItems(updated);
      setAppliedPromo({
        id: promo.id,
        title: promo.title,
        details: `$${specialBase} MXN por cada par`,
        type: 'bulk_pairs'
      });
    } else if (promo.promo_type === 'percentage_discount') {
      const discountPct = promo.discount_value ?? 15;
      const multiplier = Math.max(0, (100 - discountPct) / 100);
      const updated = items.map(item => {
        const standardBase = getStandardBasePrice(item.base_service);
        const discountedBase = Math.round(standardBase * multiplier);
        return {
          ...item,
          price: discountedBase + (item.has_whitening ? EXTRA_WHITENING_PRICE : 0)
        };
      });
      setItems(updated);
      setAppliedPromo({
        id: promo.id,
        title: promo.title,
        details: `${discountPct}% de descuento aplicado`,
        type: 'percentage_discount'
      });
    } else if (promo.promo_type === 'fixed_discount') {
      const discountTotal = promo.discount_value ?? 50;
      const discountPerItem = Math.round(discountTotal / Math.max(1, items.length));
      const updated = items.map(item => {
        const standardBase = getStandardBasePrice(item.base_service);
        const discountedBase = Math.max(0, standardBase - discountPerItem);
        return {
          ...item,
          price: discountedBase + (item.has_whitening ? EXTRA_WHITENING_PRICE : 0)
        };
      });
      setItems(updated);
      setAppliedPromo({
        id: promo.id,
        title: promo.title,
        details: `-$${discountTotal} MXN de descuento total`,
        type: 'fixed_discount'
      });
    } else if (promo.promo_type === 'package_price') {
      const pkgPrice = promo.package_price ?? 400;
      const perItem = Math.round(pkgPrice / Math.max(1, items.length));
      const updated = items.map(item => ({
        ...item,
        price: perItem + (item.has_whitening ? EXTRA_WHITENING_PRICE : 0)
      }));
      setItems(updated);
      setAppliedPromo({
        id: promo.id,
        title: promo.title,
        details: `Paquete especial $${pkgPrice} MXN`,
        type: 'package_price'
      });
    }
  };

  // Aplicar descuento manual
  const handleApplyCustomDiscount = (value: number, type: 'percent' | 'fixed') => {
    if (value <= 0) return;
    if (type === 'percent') {
      const pct = Math.min(100, value);
      const multiplier = (100 - pct) / 100;
      const updated = items.map(item => {
        const standardBase = getStandardBasePrice(item.base_service);
        return {
          ...item,
          price: Math.round(standardBase * multiplier) + (item.has_whitening ? EXTRA_WHITENING_PRICE : 0)
        };
      });
      setItems(updated);
      setAppliedPromo({
        title: `Descuento Manual ${pct}%`,
        details: `${pct}% de descuento personalizado`,
        type: 'custom'
      });
    } else {
      const discountPerItem = Math.round(value / Math.max(1, items.length));
      const updated = items.map(item => {
        const standardBase = getStandardBasePrice(item.base_service);
        return {
          ...item,
          price: Math.max(0, standardBase - discountPerItem) + (item.has_whitening ? EXTRA_WHITENING_PRICE : 0)
        };
      });
      setItems(updated);
      setAppliedPromo({
        title: `Descuento Manual $${value} MXN`,
        details: `-$${value} MXN personalizado`,
        type: 'custom'
      });
    }
    setShowCustomDiscount(false);
  };

  const handleAddItem = () => {
    const defaultSvc = availableServices[0] || MAIN_SERVICES[0];
    setItems([
      ...items,
      parseOrderItem({ service_name: defaultSvc.name, price: defaultSvc.price })
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, newBaseService: string) => {
    const newItems = [...items];
    const item = newItems[index];

    const isGorra = newBaseService === 'Gorra';
    const hasWhitening = isGorra ? false : Boolean(item.has_whitening);

    const matchedService = availableServices.find(s => s.name === newBaseService) || MAIN_SERVICES.find(s => s.name === newBaseService);
    const basePrice = matchedService ? matchedService.price : (Number(item.price) || 0);
    const finalPrice = basePrice + (hasWhitening ? EXTRA_WHITENING_PRICE : 0);

    const fullServiceName = newBaseService + (hasWhitening ? ' + Blanqueamiento de suela' : '');

    newItems[index] = {
      ...item,
      base_service: newBaseService,
      has_whitening: hasWhitening,
      service_name: fullServiceName,
      price: finalPrice
    };
    setItems(newItems);
  };

  const handleToggleWhitening = (index: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const newHasWhitening = !item.has_whitening;

    const baseName = item.base_service || 'Limpieza Sencilla';
    const matchedService = availableServices.find(s => s.name === baseName) || MAIN_SERVICES.find(s => s.name === baseName);
    const basePrice = matchedService
      ? matchedService.price
      : ((Number(item.price) || 0) - (item.has_whitening ? EXTRA_WHITENING_PRICE : 0));

    const finalPrice = Math.max(0, basePrice + (newHasWhitening ? EXTRA_WHITENING_PRICE : 0));
    const fullServiceName = baseName + (newHasWhitening ? ' + Blanqueamiento de suela' : '');

    newItems[index] = {
      ...item,
      has_whitening: newHasWhitening,
      service_name: fullServiceName,
      price: finalPrice
    };
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handlePhotoUpload = async (index: number, type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingIndex({ index, type });
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadOrderPhoto(files[i]);
        uploadedUrls.push(url);
      }

      const currentPhotos = items[index][type === 'before' ? 'before_photos' : 'after_photos'] || [];
      handleItemChange(index, type === 'before' ? 'before_photos' : 'after_photos', [...currentPhotos, ...uploadedUrls]);
    } catch (err) {
      console.error('Error al subir imagen:', err);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemovePhoto = (itemIndex: number, type: 'before' | 'after', photoUrl: string) => {
    const photos = items[itemIndex][type === 'before' ? 'before_photos' : 'after_photos'] || [];
    const filtered = photos.filter(p => p !== photoUrl);
    handleItemChange(itemIndex, type === 'before' ? 'before_photos' : 'after_photos', filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Por favor ingresa el nombre del cliente');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Por favor ingresa el número de WhatsApp del cliente');
      return;
    }
    if (items.some(it => !it.brand_model?.trim())) {
      setErrorMsg('Por favor indica la Marca/Modelo para todos los pares');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let finalNotes = notes;
      if (appliedPromo && !finalNotes.includes(appliedPromo.title)) {
        const promoTag = `[Promo: ${appliedPromo.title} - ${appliedPromo.details}]`;
        finalNotes = finalNotes ? `${finalNotes}\n${promoTag}` : promoTag;
      }

      const orderPayload: Partial<Order> = {
        id: orderToEdit?.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        reception_date: new Date(receptionDate).toISOString(),
        estimated_delivery_date: estimatedDeliveryDate || null,
        status,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        total_amount: totalAmount,
        paid_amount: numericPaidAmount,
        notes: finalNotes
      };

      const savedOrder = await saveOrder(orderPayload, items);
      onSuccess(savedOrder);
    } catch (err: any) {
      console.error('Error guardando pedido:', err);
      setErrorMsg(err.message || 'Error guardando el pedido. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-3xl w-full overflow-hidden shadow-gold-glow my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-950">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold-400" />
              {isEditing ? `Editar Pedido #${orderToEdit?.order_number}` : 'Nuevo Pedido de Tenis'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEditing ? 'Modifica los detalles del pedido y sube avances' : 'Ingresa los datos para registrar la orden y generar su enlace único de WhatsApp'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Seccion 1: Datos del Cliente */}
          <div className="bg-dark-950 p-4 rounded-xl border border-dark-700 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-bold text-gold-400 text-xs uppercase tracking-wider">1. Información del Cliente</h4>
              
              {/* Quick Select Frequent Customer Dropdown */}
              {customersList.length > 0 && (
                <div className="relative">
                  <select
                    onChange={e => {
                      const selected = customersList.find(c => c.id === e.target.value || c.phone === e.target.value);
                      if (selected) {
                        setCustomerName(selected.name);
                        setCustomerPhone(selected.phone);
                      }
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="px-3 py-1 bg-dark-900 border border-gold-500/30 rounded-lg text-gold-400 text-xs focus:outline-none cursor-pointer hover:bg-dark-800"
                  >
                    <option value="" disabled>👥 Cargar Cliente Frecuente ({customersList.length})</option>
                    {customersList.map(c => (
                      <option key={c.id || c.phone} value={c.id || c.phone}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Nombre Completo con Autocompletado */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 text-xs"
                />

                {/* Autocomplete Dropdown List */}
                {showCustomerDropdown && customersList.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-dark-900 border border-gold-500/40 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-dark-800 animate-fadeIn">
                    <div className="px-3 py-1.5 bg-dark-950 text-[10px] font-bold text-gold-400 uppercase tracking-wider flex items-center justify-between sticky top-0 border-b border-dark-800">
                      <span>👤 Seleccionar Cliente Frecuente ({customersList.length})</span>
                    </div>

                    {customersList
                      .filter(c => 
                        !customerName.trim() || 
                        c.name.toLowerCase().includes(customerName.toLowerCase()) || 
                        c.phone.includes(customerName)
                      )
                      .slice(0, 8)
                      .map(c => (
                        <div
                          key={c.id || c.phone}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone);
                            setShowCustomerDropdown(false);
                          }}
                          className="p-3 hover:bg-gold-500/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-100 block">{c.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{c.phone}</span>
                          </div>
                          <span className="text-[10px] text-gold-400 bg-gold-500/10 border border-gold-500/20 px-2 py-0.5 rounded-md font-bold">
                            Usar Perfil
                          </span>
                        </div>
                      ))}

                    {customersList.filter(c => 
                        !customerName.trim() || 
                        c.name.toLowerCase().includes(customerName.toLowerCase()) || 
                        c.phone.includes(customerName)
                      ).length === 0 && (
                        <div className="p-3 text-xs text-slate-500 text-center">
                          Sin coincidencias en clientes guardados
                        </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp (con clave lada) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 525512345678"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha de Recepción</label>
                <input
                  type="datetime-local"
                  value={receptionDate}
                  onChange={e => setReceptionDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Fecha Estimada de Entrega</label>
                <input
                  type="date"
                  value={estimatedDeliveryDate}
                  onChange={e => setEstimatedDeliveryDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Seccion 2: Pares de Tenis y Servicios */}
          <div className="bg-dark-950 p-4 rounded-xl border border-dark-700 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gold-400 text-xs uppercase tracking-wider">2. Pares de Tenis ({items.length})</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-xs font-bold text-gold-400 hover:text-gold-300 bg-gold-500/10 hover:bg-gold-500/20 px-3 py-1.5 rounded-lg border border-gold-500/30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Par
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="p-4 bg-dark-900 rounded-xl border border-dark-700 space-y-3 relative">
                
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="absolute top-3 right-3 p-1 text-slate-500 hover:text-rose-400 rounded-md hover:bg-rose-500/10"
                    title="Eliminar este par"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Par #{idx + 1}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Marca / Modelo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Nike Air Force 1 White"
                      value={item.brand_model}
                      onChange={e => handleItemChange(idx, 'brand_model', e.target.value)}
                      className="w-full px-3 py-1.5 bg-dark-950 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Servicio *</label>
                    <select
                      value={item.base_service || 'Limpieza Sencilla'}
                      onChange={e => handleServiceChange(idx, e.target.value)}
                      className="w-full px-3 py-1.5 bg-dark-950 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400 font-medium"
                    >
                      {availableServices.map(svc => (
                        <option key={svc.id} value={svc.name}>
                          {svc.name} (${svc.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Precio ($ MXN)</label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={item.price}
                      onChange={e => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-dark-950 border border-dark-700 rounded-lg text-slate-100 text-xs font-mono focus:border-gold-400"
                    />
                  </div>
                </div>

                {/* Extra Toggle Switch (Solo para tenis, no para Gorra) */}
                {item.base_service !== 'Gorra' && (
                  <div className="p-2.5 bg-dark-950/80 rounded-lg border border-dark-700/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${item.has_whitening ? 'bg-gold-500/20 text-gold-400' : 'bg-dark-800 text-slate-500'}`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Extra: Blanqueamiento de suela</span>
                        <span className="text-[10px] text-gold-400 font-mono">+$50.00 MXN</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(item.has_whitening)}
                      onClick={() => handleToggleWhitening(idx)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.has_whitening ? 'bg-gold-500 shadow-gold-glow-sm' : 'bg-dark-800 border-dark-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                          item.has_whitening ? 'translate-x-5 bg-black' : 'translate-x-0 bg-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                )}

                {/* Subida de Fotos Antes / Después */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-dark-800">
                  {/* Fotos Antes */}
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-400 mb-1 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      Fotos ANTES del servicio
                    </label>
                    
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(item.before_photos || []).map((photoUrl, pIdx) => (
                        <div key={pIdx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-dark-700">
                          <img src={photoUrl} alt="Antes" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx, 'before', photoUrl)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-dark-950 hover:bg-dark-800 rounded-lg border border-dark-700 cursor-pointer transition-colors">
                      {uploadingIndex?.index === idx && uploadingIndex?.type === 'before' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gold-400" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-gold-400" />
                      )}
                      Subir Foto Antes
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => handlePhotoUpload(idx, 'before', e)}
                      />
                    </label>
                  </div>

                  {/* Fotos Después */}
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" />
                      Fotos DESPUÉS del servicio
                    </label>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {(item.after_photos || []).map((photoUrl, pIdx) => (
                        <div key={pIdx} className="relative group w-14 h-14 rounded-lg overflow-hidden border border-dark-700">
                          <img src={photoUrl} alt="Después" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx, 'after', photoUrl)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-dark-950 hover:bg-dark-800 rounded-lg border border-dark-700 cursor-pointer transition-colors">
                      {uploadingIndex?.index === idx && uploadingIndex?.type === 'after' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      Subir Foto Después
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => handlePhotoUpload(idx, 'after', e)}
                      />
                    </label>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Seccion 3: Promociones y Descuentos */}
          <div className="bg-dark-950 p-4 rounded-xl border border-dark-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gold-500/15 text-gold-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-gold-400 text-xs uppercase tracking-wider">
                    3. Promociones y Descuentos
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Aplica promociones activas del negocio o descuentos personalizados a esta orden
                  </p>
                </div>
              </div>

              {appliedPromo && (
                <button
                  type="button"
                  onClick={handleResetPrices}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg flex items-center gap-1.5 transition-all"
                  title="Restablecer precios estándar"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Quitar Promo</span>
                </button>
              )}
            </div>

            {/* Banner de Promoción Activa Aplicada */}
            {appliedPromo && (
              <div className="p-3 bg-gradient-to-r from-emerald-950/80 via-dark-900 to-dark-950 border border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 animate-fadeIn shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/40">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-300">{appliedPromo.title}</span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded">
                        Activa
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300 block">{appliedPromo.details}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Total con Promo:</span>
                  <span className="text-sm font-extrabold text-gold-400 font-mono">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Listado de Promociones Disponibles */}
            {activePromotions.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Promociones del Negocio Disponibles ({activePromotions.length}):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activePromotions.map(promo => {
                    const isBulk = promo.promo_type === 'bulk_pairs';
                    const minPairs = promo.min_pairs || 5;
                    const isEligible = isBulk ? items.length >= minPairs : true;
                    const isCurrentApplied = appliedPromo?.id === promo.id;

                    return (
                      <div
                        key={promo.id || promo.title}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          isCurrentApplied
                            ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                            : isEligible
                            ? 'bg-dark-900 border-gold-500/30 hover:border-gold-500/60'
                            : 'bg-dark-900/60 border-dark-800 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {isBulk ? (
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                              ) : promo.promo_type === 'percentage_discount' ? (
                                <Percent className="w-3.5 h-3.5 text-gold-400" />
                              ) : (
                                <Gift className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                              <span className="text-xs font-bold text-slate-100">{promo.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {promo.description || (
                                isBulk
                                  ? `A partir de ${minPairs} pares quedan a $${promo.special_price_per_pair} c/u`
                                  : promo.promo_type === 'percentage_discount'
                                  ? `${promo.discount_value}% de descuento`
                                  : `Paquete especial por $${promo.package_price}`
                              )}
                            </p>
                          </div>

                          {promo.highlight_badge && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30 shrink-0">
                              {promo.highlight_badge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-dark-800">
                          <span className="text-[10px] text-slate-400">
                            {isBulk ? (
                              isEligible ? (
                                <span className="text-emerald-400 font-semibold">✓ Califica ({items.length}/{minPairs} pares)</span>
                              ) : (
                                <span className="text-amber-400/90 font-medium">Faltan {minPairs - items.length} par(es)</span>
                              )
                            ) : (
                              <span className="text-slate-400">Aplica a toda la orden</span>
                            )}
                          </span>

                          <button
                            type="button"
                            disabled={!isEligible}
                            onClick={() => handleApplyPromotion(promo)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              isCurrentApplied
                                ? 'bg-emerald-500 text-dark-950 cursor-default'
                                : isEligible
                                ? 'bg-gold-500 hover:bg-gold-400 text-dark-950 shadow-sm active:scale-95'
                                : 'bg-dark-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isCurrentApplied
                              ? '✓ Aplicada'
                              : isBulk
                              ? `Aplicar $${promo.special_price_per_pair}/par`
                              : promo.promo_type === 'percentage_discount'
                              ? `Aplicar -${promo.discount_value}%`
                              : `Aplicar $${promo.package_price}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                No hay promociones registradas en el catálogo. Puedes crear nuevas en el botón «Promociones» del menú.
              </p>
            )}

            {/* Sección de Descuento Manual / Personalizado */}
            <div className="pt-2 border-t border-dark-800">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCustomDiscount(!showCustomDiscount)}
                  className="text-xs font-bold text-slate-300 hover:text-gold-400 flex items-center gap-1.5 transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5 text-gold-400" />
                  <span>{showCustomDiscount ? '▼ Ocultar Descuento Manual' : '▶ Aplicar Descuento Manual / Personalizado'}</span>
                </button>
                
                {!showCustomDiscount && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomDiscount(10, 'percent')}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-900 hover:bg-gold-500/20 text-slate-300 hover:text-gold-300 border border-dark-700 hover:border-gold-500/40 transition-colors"
                    >
                      -10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCustomDiscount(15, 'percent')}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-900 hover:bg-gold-500/20 text-slate-300 hover:text-gold-300 border border-dark-700 hover:border-gold-500/40 transition-colors"
                    >
                      -15%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCustomDiscount(50, 'fixed')}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-900 hover:bg-gold-500/20 text-slate-300 hover:text-gold-300 border border-dark-700 hover:border-gold-500/40 transition-colors"
                    >
                      -$50
                    </button>
                  </div>
                )}
              </div>

              {showCustomDiscount && (
                <div className="mt-3 p-3 bg-dark-900 rounded-xl border border-dark-700 space-y-3 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Tipo de Descuento</label>
                      <div className="flex rounded-lg overflow-hidden border border-dark-700">
                        <button
                          type="button"
                          onClick={() => setCustomDiscountType('fixed')}
                          className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                            customDiscountType === 'fixed'
                              ? 'bg-gold-500 text-dark-950'
                              : 'bg-dark-950 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          $ Monto Fijo
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomDiscountType('percent')}
                          className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                            customDiscountType === 'percent'
                              ? 'bg-gold-500 text-dark-950'
                              : 'bg-dark-950 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          % Porcentaje
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Valor {customDiscountType === 'fixed' ? '($ MXN)' : '(%)'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={customDiscountType === 'fixed' ? 'Ej. 50' : 'Ej. 15'}
                        value={customDiscountValue}
                        onChange={e => setCustomDiscountValue(e.target.value)}
                        className="w-full px-3 py-1.5 bg-dark-950 border border-dark-700 rounded-lg text-xs text-slate-100 focus:border-gold-400 font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyCustomDiscount(Number(customDiscountValue) || 0, customDiscountType)}
                      disabled={!customDiscountValue || Number(customDiscountValue) <= 0}
                      className="w-full py-1.5 px-3 bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 disabled:opacity-50 text-dark-950 text-xs font-bold rounded-lg transition-all shadow-sm"
                    >
                      Aplicar Descuento
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Seccion 4: Estado, Pago y Notas */}
          <div className="bg-dark-950 p-4 rounded-xl border border-dark-700 space-y-4">
            <h4 className="font-bold text-gold-400 text-xs uppercase tracking-wider">4. Estado, Pago y Notas</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Estado del Pedido</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                >
                  <option value="received">1. Recibido</option>
                  <option value="in_progress">2. En proceso</option>
                  <option value="ready">3. Listo</option>
                  <option value="delivered">4. Entregado</option>
                  <option value="cancelled">5. Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                >
                  <option value="pending">Pendiente de Definir</option>
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia / SPEI</option>
                  <option value="card">Tarjeta Débito/Crédito</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Estado del Pago</label>
                <select
                  value={paymentStatus}
                  onChange={e => handlePaymentStatusChange(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                >
                  <option value="pending">Pendiente (Sin pagar)</option>
                  <option value="partial">Abono Parcial / Anticipo</option>
                  <option value="paid">Pagado Completo</option>
                </select>
              </div>
            </div>

            {/* Input y desglose interactivo de Abono Parcial */}
            {paymentStatus === 'partial' && (
              <div className="p-3.5 bg-dark-900/90 border border-cyan-500/40 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-bold text-cyan-400">
                      Monto abonado / anticipo ($ MXN)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Ingresa la cantidad recibida. El saldo restante se calculará automáticamente.
                    </span>
                  </div>

                  {/* Botones de acción rápida */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaidAmount(String(Math.round(totalAmount * 0.5)))}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
                      title="Calcular 50% de anticipo"
                    >
                      50% (${Math.round(totalAmount * 0.5)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount('')}
                      className="px-2 py-1 text-[11px] text-slate-400 hover:text-white bg-dark-800 rounded-lg transition-colors"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={totalAmount}
                      placeholder="0.00"
                      value={paidAmount}
                      onChange={e => setPaidAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-dark-950 border border-cyan-500/50 rounded-lg text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
                      autoFocus
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-around bg-dark-950 p-2 rounded-lg border border-dark-700 text-xs">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total</span>
                      <span className="font-mono font-bold text-slate-200">${totalAmount.toFixed(2)}</span>
                    </div>
                    <span className="text-slate-500 font-bold">-</span>
                    <div className="text-center">
                      <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">Abono</span>
                      <span className="font-mono font-bold text-cyan-300">${numericPaidAmount.toFixed(2)}</span>
                    </div>
                    <span className="text-slate-500 font-bold">=</span>
                    <div className="text-center">
                      <span className="text-[10px] text-amber-400 uppercase tracking-wider block">Resta por pagar</span>
                      <span className="font-mono font-extrabold text-amber-400">${remainingBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notas del Pedido</label>
              <textarea
                rows={2}
                placeholder="Detalles adicionales, rayones previos, solicitudes especiales del cliente..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-dark-950 rounded-xl border border-gold-500/30">
            <div>
              <span className="text-xs text-slate-400">Total a Cobrar</span>
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="text-2xl font-extrabold text-gold-400 font-mono">${totalAmount.toFixed(2)} MXN</p>
                {paymentStatus === 'partial' && (
                  <span className="text-xs font-bold text-amber-400 font-mono bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/30">
                    Abonado: ${numericPaidAmount.toFixed(2)} | Resta: ${remainingBalance.toFixed(2)}
                  </span>
                )}
                {paymentStatus === 'paid' && (
                  <span className="text-xs font-bold text-emerald-400 font-mono bg-emerald-400/10 px-2.5 py-0.5 rounded-md border border-emerald-400/30">
                    Liquidado ✓
                  </span>
                )}
                {paymentStatus === 'pending' && (
                  <span className="text-xs font-bold text-slate-400 font-mono bg-dark-800 px-2.5 py-0.5 rounded-md border border-dark-700">
                    Sin abono previo
                  </span>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Pares incluidos:</span>
              <p className="text-sm font-bold text-white">{items.length} par(es)</p>
            </div>
          </div>

          {/* Actions */}
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
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-black bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 rounded-lg shadow-gold-glow-sm disabled:opacity-50 transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {submitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Pedido & Generar Link'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
