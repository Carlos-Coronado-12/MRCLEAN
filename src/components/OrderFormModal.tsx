import React, { useState, useEffect } from 'react';
import { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '../types/database';
import { saveOrder, uploadOrderPhoto } from '../services/orderService';
import { X, Plus, Trash2, Camera, Upload, Loader2, Sparkles } from 'lucide-react';

interface OrderFormModalProps {
  orderToEdit?: Order | null;
  onClose: () => void;
  onSuccess: (savedOrder: Order) => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  orderToEdit,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(orderToEdit);

  const [customerName, setCustomerName] = useState(orderToEdit?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(orderToEdit?.customer_phone || '');
  const [receptionDate, setReceptionDate] = useState(
    orderToEdit?.reception_date ? new Date(orderToEdit.reception_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
  );
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    orderToEdit?.estimated_delivery_date || new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<OrderStatus>(orderToEdit?.status || 'received');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(orderToEdit?.payment_method || 'pending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(orderToEdit?.payment_status || 'pending');
  const [notes, setNotes] = useState(orderToEdit?.notes || '');

  // Sneakers items array
  const [items, setItems] = useState<Partial<OrderItem>[]>(
    orderToEdit?.order_items && orderToEdit.order_items.length > 0
      ? orderToEdit.order_items
      : [
          {
            brand_model: '',
            service_name: 'Limpieza Profunda',
            price: 150.00,
            before_photos: [],
            after_photos: []
          }
        ]
  );

  const [uploadingIndex, setUploadingIndex] = useState<{ index: number; type: 'before' | 'after' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate Total Amount
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        brand_model: '',
        service_name: 'Limpieza Profunda',
        price: 150.00,
        before_photos: [],
        after_photos: []
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
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
            <h4 className="font-bold text-gold-400 text-xs uppercase tracking-wider">1. Información del Cliente</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 focus:outline-none focus:border-gold-400 text-xs"
                />
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
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Servicio Realizado *</label>
                    <select
                      value={item.service_name}
                      onChange={e => handleItemChange(idx, 'service_name', e.target.value)}
                      className="w-full px-3 py-1.5 bg-dark-950 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                    >
                      <option value="Limpieza Expres">Limpieza Exprés</option>
                      <option value="Limpieza Profunda">Limpieza Profunda</option>
                      <option value="Limpieza Premium + Gamuza">Limpieza Premium + Gamuza</option>
                      <option value="Blanqueamiento de Suela">Blanqueamiento de Suela</option>
                      <option value="Restauración de Color">Restauración de Color</option>
                      <option value="Servicio Completo Custom">Servicio Completo Custom</option>
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
                  onChange={e => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                >
                  <option value="pending">Pendiente</option>
                  <option value="partial">Abono Parcial</option>
                  <option value="paid">Pagado Completo</option>
                </select>
              </div>
            </div>

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
          <div className="flex items-center justify-between p-4 bg-dark-950 rounded-xl border border-gold-500/30">
            <div>
              <span className="text-xs text-slate-400">Total a Cobrar</span>
              <p className="text-2xl font-extrabold text-gold-400 font-mono">${totalAmount.toFixed(2)} MXN</p>
            </div>
            <div className="text-right">
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
