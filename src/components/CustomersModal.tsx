import React, { useState, useEffect } from 'react';
import { Customer } from '../types/database';
import { fetchCustomers, saveCustomer, deleteCustomer } from '../services/orderService';
import { WhatsAppIcon } from './WhatsAppIcon';
import { X, Search, Plus, UserCheck, Trash2, Edit3, Save, Loader2, Sparkles, Phone, FileText } from 'lucide-react';

interface CustomersModalProps {
  onClose: () => void;
  onSelectCustomerForNewOrder?: (customer: Customer) => void;
}

export const CustomersModal: React.FC<CustomersModalProps> = ({
  onClose,
  onSelectCustomerForNewOrder
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields for create/edit
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('52');
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadCustomersData();
  }, []);

  const loadCustomersData = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    setEditingCustomer(null);
    setNameInput('');
    setPhoneInput('52');
    setNotesInput('');
    setErrorMsg('');
    setIsCreating(true);
  };

  const handleStartEdit = (cust: Customer) => {
    setIsCreating(false);
    setEditingCustomer(cust);
    setNameInput(cust.name);
    setPhoneInput(cust.phone);
    setNotesInput(cust.notes || '');
    setErrorMsg('');
  };

  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingCustomer(null);
    setNameInput('');
    setPhoneInput('');
    setNotesInput('');
    setErrorMsg('');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMsg('Ingresa el nombre del cliente');
      return;
    }
    if (!phoneInput.trim()) {
      setErrorMsg('Ingresa el número de WhatsApp');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      await saveCustomer({
        id: editingCustomer?.id,
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        notes: notesInput.trim()
      });
      await loadCustomersData();
      handleCancelForm();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cust: Customer) => {
    if (!cust.id) return;
    if (!window.confirm(`¿Seguro que deseas eliminar a ${cust.name} de tus clientes frecuentes?`)) return;

    try {
      await deleteCustomer(cust.id);
      setCustomers(customers.filter(c => c.id !== cust.id));
      if (editingCustomer?.id === cust.id) handleCancelForm();
    } catch (err) {
      console.error('Error eliminando cliente:', err);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-3xl w-full overflow-hidden shadow-gold-glow my-8 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gold-500/10 rounded-xl border border-gold-500/20 text-gold-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Catálogo de Clientes Frecuentes
              </h3>
              <p className="text-xs text-slate-400">
                Guarda los datos de tus clientes habituales para generar pedidos en segundos
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
          
          {/* Top Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-dark-950 border border-dark-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-gold-400"
              />
            </div>

            {/* Add New Button */}
            {!isCreating && !editingCustomer && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-400 to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-gold-glow-sm hover:from-gold-300 hover:to-amber-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                Agregar Nuevo Cliente
              </button>
            )}
          </div>

          {/* Form for Create / Edit */}
          {(isCreating || editingCustomer) && (
            <form onSubmit={handleSaveCustomer} className="p-4 bg-dark-950 rounded-xl border border-gold-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-dark-800 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isCreating ? 'Registrar Nuevo Cliente' : `Editar Cliente: ${editingCustomer?.name}`}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Laura Gómez"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs focus:border-gold-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gold-400" />
                    WhatsApp (con clave lada) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 525512345678"
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-dark-700 rounded-lg text-slate-100 text-xs font-mono focus:border-gold-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Notas / Preferencias del Cliente (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Prefiere horario por la tarde, le gusta lavado especial de gamuza..."
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
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
                  {saving ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          )}

          {/* List of Customers */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
              Cargando clientes frecuentes...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs bg-dark-950 rounded-xl border border-dark-800">
              No se encontraron clientes {searchTerm ? 'para esta búsqueda' : 'registrados aún'}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCustomers.map(cust => (
                <div
                  key={cust.id || cust.phone}
                  className="p-4 bg-dark-950 rounded-xl border border-dark-800 hover:border-gold-500/30 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-slate-100 text-sm">{cust.name}</h4>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cust)}
                          className="p-1 text-slate-400 hover:text-gold-400 rounded-md hover:bg-dark-800"
                          title="Editar datos de cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cust)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-dark-800"
                          title="Eliminar cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/${cust.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 hover:underline mt-1"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-400" />
                      {cust.phone}
                    </a>

                    {cust.notes && (
                      <p className="text-[11px] text-slate-400 mt-2 bg-dark-900 p-2 rounded-lg border border-dark-800 line-clamp-2">
                        {cust.notes}
                      </p>
                    )}
                  </div>

                  {onSelectCustomerForNewOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCustomerForNewOrder(cust);
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 font-bold text-xs rounded-lg border border-gold-500/30 transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Crear Pedido para {cust.name.split(' ')[0]}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
