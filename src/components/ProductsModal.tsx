import React, { useState, useEffect } from 'react';
import { Product } from '../types/database';
import { fetchProducts, saveProduct, deleteProduct } from '../services/orderService';
import { X, Search, Plus, Package, Trash2, Edit3, Save, Loader2, Sparkles, Tag, DollarSign, FileText } from 'lucide-react';

interface ProductsModalProps {
  onClose: () => void;
  onProductListUpdated?: () => void;
}

export const CATEGORY_OPTIONS = [
  { id: 'todos', label: 'Todos' },
  { id: 'servicio', label: 'Servicios' },
  { id: 'complemento', label: 'Complementos' },
  { id: 'restauracion', label: 'Restauración' },
  { id: 'producto', label: 'Productos / Insumos' }
];

export const ProductsModal: React.FC<ProductsModalProps> = ({
  onClose,
  onProductListUpdated
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');

  // Edit / Create state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields
  const [nameInput, setNameInput] = useState('');
  const [priceInput, setPriceInput] = useState<number | string>(150);
  const [categoryInput, setCategoryInput] = useState('servicio');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadProductsData();
  }, []);

  const loadProductsData = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error cargando productos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingProduct(null);
    setNameInput('');
    setPriceInput(150);
    setCategoryInput('servicio');
    setDescriptionInput('');
    setErrorMsg('');
    setIsCreating(true);
  };

  const handleStartEdit = (prod: Product) => {
    setIsCreating(false);
    setEditingProduct(prod);
    setNameInput(prod.name);
    setPriceInput(prod.price);
    setCategoryInput(prod.category || 'servicio');
    setDescriptionInput(prod.description || '');
    setErrorMsg('');
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingProduct(null);
    setNameInput('');
    setPriceInput(150);
    setCategoryInput('servicio');
    setDescriptionInput('');
    setErrorMsg('');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Ingresa el nombre del producto o servicio');
      return;
    }

    const numericPrice = Number(priceInput);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg('Ingresa un precio válido igual o mayor a 0');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await saveProduct({
        id: editingProduct?.id,
        name: nameInput.trim(),
        price: numericPrice,
        category: categoryInput,
        description: descriptionInput.trim()
      });
      await loadProductsData();
      if (onProductListUpdated) onProductListUpdated();
      handleCancelForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prod: Product) => {
    if (!prod.id) return;
    if (!window.confirm(`¿Seguro que deseas eliminar "${prod.name}" del menú de productos?`)) return;

    try {
      await deleteProduct(prod.id);
      setProducts(prev => prev.filter(p => p.id !== prod.id));
      if (onProductListUpdated) onProductListUpdated();
      if (editingProduct && editingProduct.id === prod.id) {
        handleCancelForm();
      }
    } catch (err) {
      console.warn('Error eliminando producto:', err);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat =
      selectedCategory === 'todos' ? true : (p.category || 'servicio') === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-4xl w-full overflow-hidden shadow-gold-glow my-8 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gold-500/10 rounded-xl border border-gold-500/20 text-gold-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Menú y Catálogo de Productos / Servicios
              </h3>
              <p className="text-xs text-slate-400">
                Administra tus precios, servicios de limpieza, complementos y productos de tienda
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Top Action Bar: Search & Primary Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:max-w-md flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción de producto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-950 border border-dark-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-gold-400"
              />
            </div>

            {/* Add New Button */}
            {!isCreating && !editingProduct && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-400 to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-gold-glow-sm hover:from-gold-300 hover:to-amber-400 transition-all whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Agregar Nuevo Producto</span>
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-dark-800">
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-gold-glow-sm font-bold'
                    : 'bg-dark-950 text-slate-400 border border-dark-800 hover:text-white hover:border-dark-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Form for Create / Edit */}
          {(isCreating || editingProduct) && (
            <form onSubmit={handleSaveProduct} className="p-4 bg-dark-950 rounded-xl border border-gold-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isCreating ? 'Registrar Nuevo Producto / Servicio' : `Editar Producto: ${editingProduct?.name}`}
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-gold-400" />
                    Nombre del Producto/Servicio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Limpieza Premium Gamuza"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-gold-400" />
                    Precio ($ MXN) *
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    placeholder="150"
                    value={priceInput}
                    onChange={e => setPriceInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs font-mono focus:border-gold-400"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoría</label>
                  <select
                    value={categoryInput}
                    onChange={e => setCategoryInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                  >
                    <option value="servicio">Servicio de Limpieza</option>
                    <option value="complemento">Complemento / Extra</option>
                    <option value="restauracion">Restauración / Pintura</option>
                    <option value="producto">Producto de Tienda / Insumo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Descripción del Servicio (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre lo que incluye este servicio o producto..."
                  value={descriptionInput}
                  onChange={e => setDescriptionInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-dark-800 rounded-lg border border-dark-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-black bg-gold-400 hover:bg-gold-300 rounded-lg shadow-gold-glow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          )}

          {/* List of Products */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
              Cargando catálogo de productos...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs bg-dark-950 rounded-xl border border-dark-800">
              No se encontraron productos {searchTerm ? 'para esta búsqueda' : 'en esta categoría'}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredProducts.map(prod => (
                <div
                  key={prod.id}
                  className="p-4 bg-dark-950 rounded-xl border border-dark-800 hover:border-gold-500/30 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20 inline-block mb-1">
                          {prod.category || 'servicio'}
                        </span>
                        <h4 className="font-bold text-slate-100 text-sm leading-tight">{prod.name}</h4>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(prod)}
                          className="p-1 text-slate-400 hover:text-gold-400 rounded-md hover:bg-dark-800"
                          title="Editar producto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(prod)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-dark-800"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xl font-black text-gold-400 font-mono mt-2">
                      ${Number(prod.price).toFixed(2)} <span className="text-xs text-slate-500 font-normal">MXN</span>
                    </p>

                    {prod.description && (
                      <p className="text-[11px] text-slate-400 mt-2 bg-dark-900 p-2 rounded-lg border border-dark-800 line-clamp-2">
                        {prod.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
