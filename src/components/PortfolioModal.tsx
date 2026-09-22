import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../types/database';
import { fetchPortfolioItems, savePortfolioItem, deletePortfolioItem, togglePortfolioActive, togglePortfolioFeatured, uploadOrderPhoto } from '../services/orderService';
import { 
  X, Plus, Camera, Trash2, Edit3, Sparkles, Star, Eye, EyeOff, Check, 
  Image as ImageIcon, RefreshCw, Layers, ArrowRight, CheckCircle2, Sliders, AlertCircle, Search
} from 'lucide-react';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const CATEGORY_PRESETS = [
  'Limpieza Profunda',
  'Restauración & Repintado',
  'Blanqueamiento de Suela',
  'Limpieza de Gamuza',
  'Lavado de Gorras',
  'Tratamiento Repelente'
];

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ isOpen, onClose, onUpdated }) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form edit / create state
  const [isEditingFormOpen, setIsEditingFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItem> | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [afterPhoto, setAfterPhoto] = useState<string>('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Uploading state
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Interactive preview slider state
  const [previewSliderPosition, setPreviewSliderPosition] = useState(50);

  useEffect(() => {
    if (isOpen) {
      loadPortfolio();
    }
  }, [isOpen]);

  const loadPortfolio = async () => {
    setLoading(true);
    try {
      const data = await fetchPortfolioItems(false);
      setItems(data);
    } catch (err) {
      console.error('Error cargando portafolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setTitle('');
    setCategory(CATEGORY_PRESETS[0]);
    setCustomCategory('');
    setServiceName('');
    setDescription('');
    setBeforePhoto('');
    setAfterPhoto('');
    setIsFeatured(false);
    setIsActive(true);
    setIsEditingFormOpen(true);
  };

  const handleOpenEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setTitle(item.title);
    if (CATEGORY_PRESETS.includes(item.category)) {
      setCategory(item.category);
      setCustomCategory('');
    } else {
      setCategory('custom');
      setCustomCategory(item.category);
    }
    setServiceName(item.service_name || '');
    setDescription(item.description || '');
    setBeforePhoto(item.before_photo || '');
    setAfterPhoto(item.after_photo || '');
    setIsFeatured(item.is_featured);
    setIsActive(item.is_active);
    setIsEditingFormOpen(true);
  };

  const handleBeforePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBefore(true);
    try {
      const url = await uploadOrderPhoto(file);
      setBeforePhoto(url);
    } catch (err) {
      console.error('Error al subir foto antes:', err);
      alert('No se pudo subir la foto del antes. Intenta nuevamente.');
    } finally {
      setUploadingBefore(false);
      e.target.value = '';
    }
  };

  const handleAfterPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAfter(true);
    try {
      const url = await uploadOrderPhoto(file);
      setAfterPhoto(url);
    } catch (err) {
      console.error('Error al subir foto final:', err);
      alert('No se pudo subir la foto final. Intenta nuevamente.');
    } finally {
      setUploadingAfter(false);
      e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Por favor escribe el modelo o nombre del calzado / artículo.');
      return;
    }
    if (!afterPhoto.trim()) {
      alert('La foto del resultado final (después) es obligatoria para la evidencia.');
      return;
    }

    const finalCategory = category === 'custom' 
      ? (customCategory.trim() || 'General') 
      : category;

    setIsSaving(true);
    try {
      await savePortfolioItem({
        ...(editingItem?.id ? { id: editingItem.id } : {}),
        title: title.trim(),
        category: finalCategory,
        service_name: serviceName.trim() || undefined,
        description: description.trim() || undefined,
        before_photo: beforePhoto.trim() || null,
        after_photo: afterPhoto.trim(),
        is_featured: isFeatured,
        is_active: isActive
      });

      await loadPortfolio();
      setIsEditingFormOpen(false);
      onUpdated?.();
    } catch (err: any) {
      console.error('Error guardando trabajo:', err);
      alert(err.message || 'Ocurrió un error al guardar el trabajo en el portafolio.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: PortfolioItem) => {
    try {
      const updated = await togglePortfolioActive(item.id!, !item.is_active);
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      onUpdated?.();
    } catch (err) {
      console.error('Error cambiando estado activo:', err);
    }
  };

  const handleToggleFeatured = async (item: PortfolioItem) => {
    try {
      const updated = await togglePortfolioFeatured(item.id!, !item.is_featured);
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      onUpdated?.();
    } catch (err) {
      console.error('Error cambiando destacado:', err);
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (window.confirm(`¿Estás seguro de eliminar "${item.title}" de la evidencia de calidad?`)) {
      try {
        await deletePortfolioItem(item.id!);
        setItems(prev => prev.filter(i => i.id !== item.id));
        onUpdated?.();
      } catch (err) {
        console.error('Error eliminando trabajo:', err);
      }
    }
  };

  if (!isOpen) return null;

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.service_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const allCategories = Array.from(new Set(items.map(i => i.category)));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-dark-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-dark-900 border border-gold-500/30 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-800 bg-gradient-to-r from-dark-900 via-dark-900 to-dark-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Galería de Evidencia de Calidad
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold-500/15 text-gold-300 border border-gold-500/30">
                  {items.length} Trabajos
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Fotos de trabajos terminados y comparativas Antes / Después que ven los clientes al agendar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditingFormOpen && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-dark-950 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Subir Trabajo</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-dark-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Si el formulario de creación / edición está abierto */}
          {isEditingFormOpen ? (
            <form onSubmit={handleSave} className="space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between border-b border-dark-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {editingItem?.id ? 'Editar Trabajo de Calidad' : 'Subir Nuevo Trabajo Terminado'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Completa la información y carga las fotografías para deslumbrar a tus clientes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título / Modelo */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Modelo o Nombre del Par / Artículo <span className="text-gold-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Nike Air Jordan 4 Retro 'Military Black'"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Categoría de Trabajo
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition-all"
                  >
                    {CATEGORY_PRESETS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="custom">Otra categoría personalizada...</option>
                  </select>

                  {category === 'custom' && (
                    <input
                      type="text"
                      placeholder="Escribe la categoría personalizada..."
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      className="mt-2 w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
                    />
                  )}
                </div>

                {/* Servicio Realizado */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Servicio Aplicado <span className="text-slate-500 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Detallado Premium + Gamuza"
                    value={serviceName}
                    onChange={e => setServiceName(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                {/* Descripción / Proceso */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Descripción del proceso o cuidados aplicados <span className="text-slate-500 font-normal">(Opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej. Desengrasado de gamuza, blanqueamiento de suela por oxigenación UV y capa protectora repelente de agua..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* SECCIÓN FOTOGRAFÍAS: ANTES Y DESPUÉS */}
              <div className="border border-dark-700/80 bg-dark-950/60 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-gold-400" />
                    <span className="text-xs font-bold text-slate-200">Fotografías del Trabajo</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Sube ambas para activar el comparador interactivo
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Foto ANTES */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                        <span>🔴 Foto ANTES (Sucia / Inicial)</span>
                        <span className="text-slate-500 text-[10px] font-normal">(opcional)</span>
                      </label>
                      {beforePhoto && (
                        <button
                          type="button"
                          onClick={() => setBeforePhoto('')}
                          className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Quitar
                        </button>
                      )}
                    </div>

                    {beforePhoto ? (
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-dark-700 bg-dark-950 group">
                        <img src={beforePhoto} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none" />
                        <img src={beforePhoto} alt="Antes" className="relative w-full h-full object-contain p-2" />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/90 text-white shadow">
                          ANTES
                        </div>
                      </div>
                    ) : (
                      <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-dark-700 hover:border-rose-500/50 bg-dark-900/50 hover:bg-rose-500/5 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBeforePhotoUpload}
                          disabled={uploadingBefore}
                        />
                        {uploadingBefore ? (
                          <RefreshCw className="w-6 h-6 text-rose-400 animate-spin mb-2" />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-slate-500 mb-2 group-hover:text-rose-400" />
                        )}
                        <span className="text-xs font-semibold text-slate-300">
                          {uploadingBefore ? 'Subiendo foto...' : 'Subir foto del ANTES'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG o WEBP</span>
                      </label>
                    )}
                  </div>

                  {/* Foto DESPUÉS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span>🟢 Foto DESPUÉS (Terminado)</span>
                        <span className="text-gold-400 text-[10px] font-bold">* Obligatorio</span>
                      </label>
                      {afterPhoto && (
                        <button
                          type="button"
                          onClick={() => setAfterPhoto('')}
                          className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Quitar
                        </button>
                      )}
                    </div>

                    {afterPhoto ? (
                      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-dark-700 bg-dark-950 group">
                        <img src={afterPhoto} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none" />
                        <img src={afterPhoto} alt="Después" className="relative w-full h-full object-contain p-2" />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/90 text-white shadow">
                          DESPUÉS
                        </div>
                      </div>
                    ) : (
                      <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-dark-700 hover:border-emerald-500/50 bg-dark-900/50 hover:bg-emerald-500/5 flex flex-col items-center justify-center cursor-pointer transition-all p-4 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAfterPhotoUpload}
                          disabled={uploadingAfter}
                        />
                        {uploadingAfter ? (
                          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                        ) : (
                          <ImageIcon className="w-7 h-7 text-slate-500 mb-2 group-hover:text-emerald-400" />
                        )}
                        <span className="text-xs font-semibold text-slate-300">
                          {uploadingAfter ? 'Subiendo foto...' : 'Subir foto del DESPUÉS'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">JPG, PNG o WEBP</span>
                      </label>
                    )}
                  </div>

                </div>

                {/* Previsualización Interactiva Antes/Después si ambas fotos existen */}
                {beforePhoto && afterPhoto && (
                  <div className="mt-4 pt-3 border-t border-dark-800">
                    <span className="text-[11px] font-bold text-gold-400 uppercase tracking-wider block mb-2">
                      ⚡ Previsualización en Vivo de la Comparativa
                    </span>
                    <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[380px] rounded-xl overflow-hidden border border-gold-500/40 select-none bg-dark-950">
                      {/* Fondo blur elegante para fotos verticales */}
                      <img src={afterPhoto} alt="" className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-110 pointer-events-none" />

                      {/* Imagen Después (Fondo) */}
                      <img src={afterPhoto} alt="Después" className="absolute inset-0 w-full h-full object-contain p-2" />
                      <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/90 text-white shadow">
                        DESPUÉS
                      </div>

                      {/* Imagen Antes (Clip-path para preservar escala idéntica sin distorsión) */}
                      <img
                        src={beforePhoto}
                        alt="Antes"
                        className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none"
                        style={{ clipPath: `inset(0 ${100 - previewSliderPosition}% 0 0)` }}
                      />
                      <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/90 text-white shadow pointer-events-none">
                        ANTES
                      </div>

                      {/* Línea divisoria dorada y manija */}
                      <div
                        className="absolute inset-y-0 w-0.5 bg-gold-400 shadow-[0_0_15px_rgba(212,175,55,0.9)] pointer-events-none z-10"
                        style={{ left: `${previewSliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-gold-400 border-2 border-dark-950 flex items-center justify-center text-dark-950 shadow-md">
                          <Sliders className="w-3.5 h-3.5 rotate-90" />
                        </div>
                      </div>

                      {/* Control Slider Range */}
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={previewSliderPosition}
                        onChange={e => setPreviewSliderPosition(Number(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-1.5">
                      Arrastra el cursor sobre la imagen para comparar el cambio
                    </p>
                  </div>
                )}
              </div>


              {/* Switches de Visibilidad y Destacado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer hover:border-dark-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Star className={`w-4 h-4 ${isFeatured ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Destacar Trabajo</span>
                      <span className="text-[10px] text-slate-400">Mostrarlo con insignia de trabajo estrella</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-gold-500 rounded border-dark-700 bg-dark-900 focus:ring-gold-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-dark-800 cursor-pointer hover:border-dark-700 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Eye className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Visible al Cliente</span>
                      <span className="text-[10px] text-slate-400">Mostrar en el catálogo de agendado</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-500 rounded border-dark-700 bg-dark-900 focus:ring-emerald-500"
                  />
                </label>
              </div>

              {/* Botones de acción formulario */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setIsEditingFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-dark-800 border border-dark-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || uploadingBefore || uploadingAfter}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-dark-950 shadow-lg disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingItem?.id ? 'Actualizar Trabajo' : 'Publicar Trabajo'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          ) : (
            // Lista de Trabajos del Portafolio
            <div className="space-y-4">
              
              {/* Filtros y Búsqueda */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por modelo, categoría o servicio..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      categoryFilter === 'all'
                        ? 'bg-gold-500/20 text-gold-300 border border-gold-500/60'
                        : 'bg-dark-950 text-slate-400 border border-dark-800 hover:border-dark-700'
                    }`}
                  >
                    Todos ({items.length})
                  </button>
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        categoryFilter === cat
                          ? 'bg-gold-500/20 text-gold-300 border border-gold-500/60'
                          : 'bg-dark-950 text-slate-400 border border-dark-800 hover:border-dark-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de Trabajos */}
              {loading ? (
                <div className="py-16 text-center">
                  <RefreshCw className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Cargando portafolio de calidad...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-dark-800 rounded-2xl bg-dark-950/40">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-300">No hay fotos de trabajos en esta categoría</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Haz clic en "Subir Trabajo" para agregar fotos de tus servicios terminados.
                  </p>
                  <button
                    onClick={handleOpenCreate}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gold-500/20 text-gold-300 border border-gold-500/40 hover:bg-gold-500/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Subir Primer Trabajo</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      className={`bg-dark-950 rounded-2xl border ${
                        item.is_featured ? 'border-gold-500/50 shadow-[0_0_15px_rgba(212,175,55,0.1)]' : 'border-dark-800'
                      } overflow-hidden flex flex-col justify-between group transition-all hover:border-dark-700`}
                    >
                      {/* Imagen Preview */}
                      <div className="relative aspect-[4/3] bg-dark-950 overflow-hidden">
                        <img
                          src={item.after_photo}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
                        />
                        <img
                          src={item.after_photo}
                          alt={item.title}
                          className="relative w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />

                        
                        {/* Overlay Badges */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-dark-950/90 backdrop-blur-sm text-gold-300 border border-gold-500/30">
                            {item.category}
                          </span>
                          {item.is_featured && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500 text-dark-950 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-dark-950" /> Destacado
                            </span>
                          )}
                        </div>

                        {item.before_photo && (
                          <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-dark-900/90 text-slate-200 border border-dark-700 flex items-center gap-1 backdrop-blur-sm">
                            <span className="text-rose-400 font-extrabold">Antes</span>
                            <span>&</span>
                            <span className="text-emerald-400 font-extrabold">Después</span>
                          </div>
                        )}

                        {!item.is_active && (
                          <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <EyeOff className="w-3.5 h-3.5" /> Oculto al Cliente
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info & Card Actions */}
                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{item.title}</h4>
                          {item.service_name && (
                            <p className="text-xs text-gold-400 font-medium mt-0.5">{item.service_name}</p>
                          )}
                          {item.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1.5">{item.description}</p>
                          )}
                        </div>

                        {/* Quick action bar */}
                        <div className="pt-3 border-t border-dark-850 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleFeatured(item)}
                              title={item.is_featured ? 'Quitar de destacados' : 'Marcar como destacado'}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                item.is_featured
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : 'text-slate-500 border-transparent hover:border-dark-700 hover:text-slate-300'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${item.is_featured ? 'fill-amber-300' : ''}`} />
                            </button>

                            <button
                              onClick={() => handleToggleActive(item)}
                              title={item.is_active ? 'Ocultar al cliente' : 'Hacer visible al cliente'}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                item.is_active
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-dark-800 text-slate-500 border-dark-700'
                              }`}
                            >
                              {item.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-gold-300 hover:bg-dark-800 transition-colors"
                              title="Editar trabajo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Eliminar trabajo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
