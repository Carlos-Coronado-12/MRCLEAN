import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types/database';
import { fetchOrders, updateOrderStatus, generateWhatsAppLink, deleteOrder } from '../services/orderService';
import { Header } from '../components/Header';
import { StatusBadge, PaymentStatusBadge, STATUS_CONFIG } from '../components/StatusBadge';
import { OrderFormModal } from '../components/OrderFormModal';
import { QRModal } from '../components/QRModal';
import { SettingsModal } from '../components/SettingsModal';
import { CustomersModal } from '../components/CustomersModal';
import { ProductsModal } from '../components/ProductsModal';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import {
  Search, Plus, RefreshCw, Copy, Check, QrCode, ExternalLink, DollarSign,
  Package, Clock, CheckCircle2, AlertCircle, Eye, Edit3, Filter, Sparkles, TrendingUp, UserCheck, Trash2
} from 'lucide-react';

export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isProductsOpen, setIsProductsOpen] = useState(false);

  // Copy link feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadOrdersData();
  }, []);

  const loadOrdersData = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (e) {
      console.error('Error cargando pedidos:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = () => {
    setOrderToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setOrderToEdit(order);
    setIsFormModalOpen(true);
  };

  const handleDeleteOrder = async (order: Order) => {
    if (window.confirm(`¿Estás seguro de eliminar el pedido #${order.order_number} de "${order.customer_name}"? Esta acción no se puede deshacer.`)) {
      try {
        await deleteOrder(order.id);
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } catch (err) {
        console.error('Error eliminando pedido:', err);
        alert('Ocurrió un error al eliminar el pedido. Inténtalo nuevamente.');
      }
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { order: updated } = await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (err) {
      console.error('Error al cambiar estado:', err);
    }
  };

  const handleCopyLink = (order: Order) => {
    const publicUrl = `${window.location.origin}/pedido/${order.public_token}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Calculations for KPIs
  const todayStr = new Date().toISOString().slice(0, 10);
  const ordersToday = orders.filter(o => o.reception_date && o.reception_date.slice(0, 10) === todayStr).length;
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const totalRevenue = orders.reduce((sum, o) => {
    if (o.status === 'cancelled') return sum;
    if (o.payment_status === 'paid') return sum + o.total_amount;
    return sum + (o.paid_amount || 0);
  }, 0);
  const pendingCollection = orders.reduce((sum, o) => {
    if (o.status === 'cancelled') return sum;
    if (o.payment_status === 'paid') return sum;
    const paid = o.paid_amount || 0;
    return sum + Math.max(0, o.total_amount - paid);
  }, 0);

  // Filtering orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer_phone.includes(searchTerm) ||
      (STATUS_CONFIG[o.status]?.label || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col">
      <Header
        onOpenCustomers={() => setIsCustomersOpen(true)}
        onOpenProducts={() => setIsProductsOpen(true)}
        onLogout={onLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Header Title & Action */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
              Panel Administrativo de Pedidos
              <Sparkles className="w-6 h-6 text-gold-400 shrink-0" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Administra tus órdenes de restauración de tenis, catálogo de productos, clientes y notifica por WhatsApp en tiempo real.
            </p>
          </div>

          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2.5 shrink-0">
            <button
              onClick={loadOrdersData}
              className="p-2.5 bg-dark-900 hover:bg-dark-800 border border-dark-700 rounded-xl text-slate-400 hover:text-white transition-all shrink-0"
              title="Recargar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsProductsOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-200 bg-dark-900 hover:bg-dark-800 border border-gold-500/30 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0"
              title="Administrar catálogo de productos y servicios"
            >
              <Package className="w-4 h-4 text-gold-400 shrink-0" />
              <span>Menú Productos</span>
            </button>

            <button
              onClick={() => setIsCustomersOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-200 bg-dark-900 hover:bg-dark-800 border border-gold-500/30 rounded-xl transition-all shadow-sm whitespace-nowrap shrink-0"
            >
              <UserCheck className="w-4 h-4 text-gold-400 shrink-0" />
              <span>Clientes Frecuentes</span>
            </button>

            <button
              onClick={handleCreateOrder}
              className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 hover:from-gold-300 hover:to-amber-400 rounded-xl shadow-gold-glow transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Nuevo Pedido</span>
            </button>
          </div>
        </div>

        {/* Dashboard KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gold-400" /> Pedidos Hoy
            </span>
            <p className="text-2xl font-black text-white">{ordersToday}</p>
          </div>

          <div className="bg-dark-900 border border-blue-500/20 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> En Proceso
            </span>
            <p className="text-2xl font-black text-blue-400">{inProgressCount}</p>
          </div>

          <div className="bg-dark-900 border border-emerald-500/20 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Pedidos Listos
            </span>
            <p className="text-2xl font-black text-emerald-400">{readyCount}</p>
          </div>

          <div className="bg-dark-900 border border-purple-500/20 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> Entregados
            </span>
            <p className="text-2xl font-black text-purple-300">{deliveredCount}</p>
          </div>

          <div className="bg-dark-900 border border-gold-500/30 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Total Vendido
            </span>
            <p className="text-xl font-black text-gold-400 font-mono">${totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-dark-900 border border-amber-500/20 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Por Cobrar
            </span>
            <p className="text-xl font-black text-amber-400 font-mono">${pendingCollection.toFixed(2)}</p>
          </div>

        </div>

        {/* Search & Filter Bar */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por cliente, orden #, WhatsApp o estado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-950 border border-dark-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-gold-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-gold-400 mr-1 hidden lg:block" />
            {[
              { id: 'all', label: 'Todos' },
              { id: 'received', label: 'Recibidos' },
              { id: 'in_progress', label: 'En Proceso' },
              { id: 'ready', label: 'Listos' },
              { id: 'delivered', label: 'Entregados' },
              { id: 'cancelled', label: 'Cancelados' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-gold-glow-sm'
                    : 'bg-dark-950 text-slate-400 border border-dark-700 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Orders Data Table / Card View */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gold-400" />
              <p className="text-xs font-medium">Cargando órdenes de Mr Clean Sneakers...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <AlertCircle className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-base font-bold text-slate-200">No se encontraron pedidos</p>
              <p className="text-xs text-slate-500">Prueba ajustando el término de búsqueda o limpia los filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                
                {/* Table Header */}
                <thead className="bg-dark-950 border-b border-dark-700 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Orden</th>
                    <th className="py-3.5 px-4">Cliente & WhatsApp</th>
                    <th className="py-3.5 px-4">Tenis / Servicios</th>
                    <th className="py-3.5 px-4">Estado Pedido</th>
                    <th className="py-3.5 px-4">Total / Pago</th>
                    <th className="py-3.5 px-4 text-right">Acciones Rápidas</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-dark-800">
                  {filteredOrders.map(order => {
                    const publicUrl = `${window.location.origin}/pedido/${order.public_token}`;
                    const isCopied = copiedId === order.id;

                    return (
                      <tr key={order.id} className="hover:bg-dark-800/50 transition-colors">
                        
                        {/* Order Number & Token */}
                        <td className="py-4 px-4 font-mono">
                          <span className="text-sm font-extrabold text-gold-400">#{order.order_number}</span>
                          <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                            {order.public_token}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4">
                          <p className="font-bold text-slate-100">{order.customer_name}</p>
                          <a
                            href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono mt-0.5"
                          >
                            <WhatsAppIcon className="w-3 h-3 fill-emerald-400" />
                            {order.customer_phone}
                          </a>
                        </td>

                        {/* Items */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {order.order_items?.map((item, idx) => (
                              <div key={idx} className="text-[11px]">
                                <span className="font-semibold text-slate-200">{item.brand_model}</span>
                                <span className="text-slate-400"> — {item.service_name}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Status & Selector */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            <StatusBadge status={order.status} size="sm" />
                            
                            {/* Fast status switcher select */}
                            <div>
                              <select
                                value={order.status}
                                onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                                className="bg-dark-950 text-[10px] text-slate-300 border border-dark-700 rounded px-1.5 py-0.5 focus:border-gold-400 cursor-pointer"
                              >
                                <option value="received">1. Recibido</option>
                                <option value="in_progress">2. En proceso</option>
                                <option value="ready">3. Listo</option>
                                <option value="delivered">4. Entregado</option>
                                <option value="cancelled">5. Cancelado</option>
                              </select>
                            </div>
                          </div>
                        </td>

                        {/* Amount & Payment */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {order.payment_status === 'partial' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Resta</span>
                                  <span className="text-base font-extrabold text-amber-400 font-mono">
                                    ${Math.max(0, order.total_amount - (order.paid_amount || 0)).toFixed(2)}
                                  </span>
                                </div>
                                <PaymentStatusBadge status={order.payment_status} />
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                                <span>Tot: ${order.total_amount.toFixed(2)}</span>
                                <span className="text-slate-600">•</span>
                                <span className="text-cyan-400 font-medium">Abonó: ${(order.paid_amount || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-gold-400 font-mono">${order.total_amount.toFixed(2)}</p>
                              <PaymentStatusBadge status={order.payment_status} />
                            </div>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Ver pedido público */}
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-white rounded-lg border border-dark-700"
                              title="Abrir Vista del Cliente"
                            >
                              <Eye className="w-4 h-4" />
                            </a>

                            {/* Editar */}
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="p-2 bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-gold-400 rounded-lg border border-dark-700"
                              title="Editar pedido"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Copiar Link */}
                            <button
                              onClick={() => handleCopyLink(order)}
                              className="p-2 bg-dark-950 hover:bg-dark-800 text-slate-400 hover:text-gold-400 rounded-lg border border-dark-700"
                              title="Copiar Link Único de WhatsApp"
                            >
                              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>

                            {/* WhatsApp Directo */}
                            <a
                              href={generateWhatsAppLink(order, order.status === 'ready' ? 'ready' : 'new_order')}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30"
                              title="Enviar mensaje por WhatsApp"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </a>

                            {/* Generar QR */}
                            <button
                              onClick={() => setQrOrder(order)}
                              className="p-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 rounded-lg border border-gold-500/30"
                              title="Generar Código QR Imprimible"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            {/* Eliminar Pedido */}
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:border-rose-500/50 rounded-lg border border-rose-500/30 transition-colors"
                              title="Eliminar pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          )}
        </div>

      </main>

      {/* Modals */}
      {isFormModalOpen && (
        <OrderFormModal
          orderToEdit={orderToEdit}
          onClose={() => setIsFormModalOpen(false)}
          onSuccess={(saved) => {
            setIsFormModalOpen(false);
            loadOrdersData();
          }}
        />
      )}

      {qrOrder && (
        <QRModal
          order={qrOrder}
          onClose={() => setQrOrder(null)}
        />
      )}

      {isCustomersOpen && (
        <CustomersModal
          onClose={() => setIsCustomersOpen(false)}
          onSelectCustomerForNewOrder={(cust) => {
            setOrderToEdit({
              customer_name: cust.name,
              customer_phone: cust.phone
            } as any);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {isProductsOpen && (
        <ProductsModal
          onClose={() => setIsProductsOpen(false)}
        />
      )}

    </div>
  );
};
