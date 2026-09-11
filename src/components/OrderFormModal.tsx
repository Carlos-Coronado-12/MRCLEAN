import React, { useState, useEffect } from 'react';
import { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus, Customer, Product, PickupRequest } from '../types/database';
import { saveOrder, uploadOrderPhoto, fetchCustomers, fetchProducts } from '../services/orderService';
import { X, Plus, Trash2, Camera, Upload, Loader2, Sparkles, UserCheck, ChevronDown } from 'lucide-react';

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
        notes
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

          {/* Seccion 3: Estado, Pago y Notas */}
          <div className="bg-dark-950 p-4 rounded-xl border border-dark-700 space-y-4">
            <h4 className="font-bold text-gold-400 text-xs uppercase tracking-wider">3. Estado, Pago y Notas</h4>

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
