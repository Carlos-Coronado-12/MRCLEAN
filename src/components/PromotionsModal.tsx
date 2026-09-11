import React, { useState, useEffect } from 'react';
import { Promotion, PromoType } from '../types/database';
import { fetchPromotions, savePromotion, deletePromotion, togglePromotionActive } from '../services/orderService';
import { X, Plus, Trash2, Edit3, Save, Sparkles, Tag, DollarSign, Percent, Package, Check, AlertCircle, RefreshCw, Layers } from 'lucide-react';

interface PromotionsModalProps {
  onClose: () => void;
  onPromotionsUpdated?: () => void;
}

export const PromotionsModal: React.FC<PromotionsModalProps> = ({ onClose, onPromotionsUpdated }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promoType, setPromoType] = useState<PromoType>('bulk_pairs');
  const [minPairs, setMinPairs] = useState<number | string>(5);
  const [specialPricePerPair, setSpecialPricePerPair] = useState<number | string>(100);
  const [discountValue, setDiscountValue] = useState<number | string>(15);
  const [packagePrice, setPackagePrice] = useState<number | string>(400);
  const [highlightBadge, setHighlightBadge] = useState('SUPER PROMO');
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    setLoading(true);
    try {
      const data = await fetchPromotions();
      setPromotions(data);
    } catch (err) {
      console.error('Error cargando promociones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingPromo(null);
    setTitle('');
    setDescription('');
    setPromoType('bulk_pairs');
    setMinPairs(5);
    setSpecialPricePerPair(100);
    setDiscountValue(15);
    setPackagePrice(400);
    setHighlightBadge('SUPER PROMO');
    setIsActive(true);
    setErrorMsg('');
    setIsCreating(true);
  };

  const handleStartEdit = (promo: Promotion) => {
    setIsCreating(false);
    setEditingPromo(promo);
    setTitle(promo.title);
    setDescription(promo.description || '');
    setPromoType(promo.promo_type);
    setMinPairs(promo.min_pairs ?? 5);
    setSpecialPricePerPair(promo.special_price_per_pair ?? 100);
    setDiscountValue(promo.discount_value ?? 15);
    setPackagePrice(promo.package_price ?? 400);
    setHighlightBadge(promo.highlight_badge || 'SUPER PROMO');
    setIsActive(promo.is_active);
    setErrorMsg('');
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingPromo(null);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Escribe el título de la promoción');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const payload: Partial<Promotion> = {
        id: editingPromo ? editingPromo.id : undefined,
        title: title.trim(),
        description: description.trim() || null,
        promo_type: promoType,
        min_pairs: Number(minPairs) || 1,
        special_price_per_pair: Number(specialPricePerPair) || 0,
        discount_value: Number(discountValue) || 0,
        package_price: Number(packagePrice) || 0,
        highlight_badge: highlightBadge.trim() || null,
        is_active: isActive
      };

      await savePromotion(payload);
      await loadPromos();
      handleCancel();
      if (onPromotionsUpdated) onPromotionsUpdated();
    } catch (err: any) {
      console.error('Error guardando promoción:', err);
      setErrorMsg(err.message || 'Error al guardar la promoción');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (promo: Promotion) => {
    if (!promo.id) return;
    try {
      const updated = await togglePromotionActive(promo.id, !promo.is_active);
      setPromotions(prev => prev.map(p => p.id === promo.id ? updated : p));
      if (onPromotionsUpdated) onPromotionsUpdated();
    } catch (err) {
      console.error('Error cambiando estado de promo:', err);
    }
  };

  const handleDelete = async (promo: Promotion) => {
    if (window.confirm(`¿Estás seguro de eliminar la promoción "${promo.title}"?`)) {
      try {
        if (promo.id) {
          await deletePromotion(promo.id);
          setPromotions(prev => prev.filter(p => p.id !== promo.id));
          if (onPromotionsUpdated) onPromotionsUpdated();
        }
      } catch (err) {
        console.error('Error eliminando promoción:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Promociones y Descuentos
              </h2>
              <p className="text-xs text-slate-400">
                Configura ofertas por volumen de pares, combos o descuentos para tu tienda y página de agendado
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Top Button to Create */}
          {!isCreating && !editingPromo && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                Promociones configuradas ({promotions.length}):
              </span>
              <button
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 shadow-[0_0_15px_rgba(212,175,55,0.25)] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Promoción</span>
              </button>
            </div>
          )}

          {/* Form Create / Edit */}
          {(isCreating || editingPromo) && (
            <form onSubmit={handleSave} className="bg-dark-950 border border-gold-500/30 rounded-2xl p-4 sm:p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-dark-800 pb-2.5">
                <span className="text-sm font-bold text-gold-400 flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  {editingPromo ? 'Editar Promoción' : 'Crear Nueva Promoción'}
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancelar
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Selector de Tipo de Promoción */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tipo de Oferta / Promoción
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { id: 'bulk_pairs', label: '👟 Por Volumen de Pares', sub: 'A partir de N pares a $X c/u' },
                    { id: 'package_price', label: '📦 Combo / Paquete', sub: 'N pares por $X total' },
                    { id: 'percentage_discount', label: '🏷️ Descuento %', sub: 'Porcentaje en total' },
                    { id: 'fixed_discount', label: '💵 Descuento Fijo', sub: '$X pesos de descuento' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPromoType(t.id as PromoType)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        promoType === t.id
                          ? 'bg-gold-500/15 border-gold-500 text-gold-300 shadow-sm'
                          : 'bg-dark-900 border-dark-800 text-slate-400 hover:border-dark-700'
                      }`}
                    >
                      <span className="text-xs font-bold block text-slate-200">{t.label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{t.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parámetros específicos según el tipo */}
              {promoType === 'bulk_pairs' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-dark-900/60 p-3 rounded-xl border border-dark-800">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      A partir de cuántos pares:
                    </label>
                    <input
                      type="number"
                      min={2}
                      value={minPairs}
                      onChange={e => setMinPairs(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Precio especial por par ($ MXN):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={specialPricePerPair}
                      onChange={e => setSpecialPricePerPair(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                </div>
              )}

              {promoType === 'package_price' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-dark-900/60 p-3 rounded-xl border border-dark-800">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Cantidad de pares del paquete:
                    </label>
                    <input
                      type="number"
                      min={2}
                      value={minPairs}
                      onChange={e => setMinPairs(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Precio total del paquete ($ MXN):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={packagePrice}
                      onChange={e => setPackagePrice(e.target.value)}
                      className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                  </div>
                </div>
              )}

              {promoType === 'percentage_discount' && (
                <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-800">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Porcentaje de Descuento (%):
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>
              )}

              {promoType === 'fixed_discount' && (
                <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-800">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Monto de Descuento ($ MXN):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>
              )}

              {/* Título y Descripción */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Título de la Promo <span className="text-gold-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Promo 5+ Pares a $100 c/u"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Etiqueta / Badge destacado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. SUPER PROMO, POPULAR, MAYOREO"
                    value={highlightBadge}
                    onChange={e => setHighlightBadge(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descripción / Texto para el cliente (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. A partir de 5 pares tu limpieza te sale a solo $100 cada par"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 focus:border-gold-500 rounded-xl px-3 py-2 text-sm text-slate-100 outline-none"
                />
              </div>

              {/* Estado Activo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo-active-check"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-gold-500 focus:ring-0 bg-dark-900 border-dark-700 cursor-pointer"
                />
                <label htmlFor="promo-active-check" className="text-xs text-slate-300 cursor-pointer">
                  Promoción activa y visible en el agendado
                </label>
              </div>

              {/* Botones */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-800">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-dark-900 hover:bg-dark-800 border border-dark-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 flex items-center gap-1.5 shadow"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List of Promotions */}
          {loading ? (
            <div className="py-12 text-center">
              <RefreshCw className="w-7 h-7 text-gold-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Cargando promociones...</p>
            </div>
          ) : promotions.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-300">No hay promociones configuradas</p>
              <p className="text-xs text-slate-500 mt-1">Crea tu primera promo para incentivar a tus clientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map(promo => {
                let badgeDetail = '';
                if (promo.promo_type === 'bulk_pairs') {
                  badgeDetail = `${promo.min_pairs}+ pares a $${promo.special_price_per_pair} c/u`;
                } else if (promo.promo_type === 'package_price') {
                  badgeDetail = `${promo.min_pairs} pares por $${promo.package_price}`;
                } else if (promo.promo_type === 'percentage_discount') {
                  badgeDetail = `${promo.discount_value}% de descuento`;
                } else {
                  badgeDetail = `$${promo.discount_value} MXN de descuento`;
                }

                return (
                  <div
                    key={promo.id}
                    className={`bg-dark-950/80 border rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      promo.is_active ? 'border-gold-500/30' : 'border-dark-800 opacity-60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {promo.highlight_badge && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-gold-500/20 text-gold-300 border border-gold-500/40">
                            {promo.highlight_badge}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-100">{promo.title}</h4>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-dark-900 border border-dark-700 text-cyan-300">
                          {badgeDetail}
                        </span>
                      </div>
                      {promo.description && (
                        <p className="text-xs text-slate-400">{promo.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Switch Activo / Pausado */}
                      <button
                        type="button"
                        onClick={() => handleToggle(promo)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          promo.is_active
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-dark-900 text-slate-500 border-dark-800'
                        }`}
                      >
                        {promo.is_active ? '✓ Activa' : 'Pausada'}
                      </button>

                      <button
                        onClick={() => handleStartEdit(promo)}
                        className="p-1.5 text-slate-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(promo)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
