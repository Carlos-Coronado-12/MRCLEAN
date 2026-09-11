import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { PickupRequest, PickupStatus } from '../types/database';
import { 
  fetchPickupRequests, 
  updatePickupRequestStatus, 
  deletePickupRequest, 
  generatePickupWhatsAppClientLink 
} from '../services/orderService';
import { WhatsAppIcon } from './WhatsAppIcon';
import { 
  X, Instagram, Copy, Check, ExternalLink, QrCode, Download, 
  Calendar, Clock, MapPin, Phone, User, Package, Search, Filter, 
  CheckCircle2, AlertCircle, Trash2, ArrowRight, Sparkles, PlusCircle, RefreshCw, Eye
} from 'lucide-react';

interface PickupRequestsModalProps {
  onClose: () => void;
  onConvertToOrder: (pickup: PickupRequest) => void;
}

const STATUS_CONFIG: Record<PickupStatus, { label: string; bg: string; text: string; border: string }> = {
  pending: {
    label: 'Pendiente',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30'
  },
  confirmed: {
    label: 'Confirmada / En Ruta',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/30'
  },
  collected: {
    label: 'Recolectada / En Taller',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30'
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30'
  }
};

export const PickupRequestsModal: React.FC<PickupRequestsModalProps> = ({ onClose, onConvertToOrder }) => {
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Link & QR Tool states
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const publicBookingUrl = `${window.location.origin}/agendar`;

  useEffect(() => {
    loadPickups();
  }, []);

  const loadPickups = async () => {
    setLoading(true);
    try {
      const data = await fetchPickupRequests();
      setPickups(data);
    } catch (e) {
      console.error('Error cargando colectas:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicBookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleStatusChange = async (pickupId: string, newStatus: PickupStatus) => {
    try {
      const updated = await updatePickupRequestStatus(pickupId, newStatus);
      setPickups(prev => prev.map(p => p.id === pickupId ? updated : p));
    } catch (e) {
      console.error('Error actualizando estado de colecta:', e);
    }
  };

  const handleDelete = async (pickup: PickupRequest) => {
    if (window.confirm(`¿Estás seguro de eliminar la solicitud #${pickup.request_number} de ${pickup.customer_name}?`)) {
      try {
        if (pickup.id) {
          await deletePickupRequest(pickup.id);
          setPickups(prev => prev.filter(p => p.id !== pickup.id));
        }
      } catch (e) {
        console.error('Error eliminando colecta:', e);
      }
    }
  };

  const handleDownloadQR = () => {
    setDownloadingQR(true);
    try {
      const svg = document.querySelector('#pickup-qr-container svg') as SVGElement;
      if (!svg) {
        setDownloadingQR(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const padding = 40;
        const headerHeight = 70;
        const footerHeight = 60;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + headerHeight + footerHeight;

        if (ctx) {
          // Fondo oscuro elegante
          ctx.fillStyle = '#0a0d14';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Borde dorado
          ctx.strokeStyle = '#D4AF37';
          ctx.lineWidth = 4;
          ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

          // Encabezado
          ctx.fillStyle = '#F5ECC6';
          ctx.font = 'bold 18px serif';
          ctx.textAlign = 'center';
          ctx.fillText(`MR CLEAN SNEAKERS`, canvas.width / 2, 38);

          ctx.fillStyle = '#D4AF37';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`AGENDA TU COLECTA A DOMICILIO`, canvas.width / 2, 58);

          // Dibujar QR con fondo blanco
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(padding - 6, headerHeight - 6, img.width + 12, img.height + 12);
          ctx.drawImage(img, padding, headerHeight);

          // Pie
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px sans-serif';
          ctx.fillText(`Escanea para agendar recolección`, canvas.width / 2, canvas.height - 25);

          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `QR-Instagram-Colectas-MrClean.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        setDownloadingQR(false);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Error generando QR de colecta:', err);
      setDownloadingQR(false);
    }
  };

  const pendingCount = pickups.filter(p => p.status === 'pending').length;

  // Filtrado de colectas
  const filteredPickups = pickups.filter(p => {
    const matchesSearch = 
      p.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.request_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer_phone.includes(searchTerm) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.neighborhood || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-dark-700 bg-dark-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-600 via-rose-500 to-amber-500 p-0.5 flex items-center justify-center shadow-md shrink-0">
              <div className="w-full h-full bg-dark-950 rounded-[10px] flex items-center justify-center">
                <Instagram className="w-5 h-5 text-pink-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  Colectas a Domicilio (Instagram & Web)
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                    {pendingCount} {pendingCount === 1 ? 'nueva' : 'nuevas'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Gestiona las recolecciones agendadas por clientes desde tu link de Instagram
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instagram Bio Link Marketing Banner */}
        <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-amber-950/40 border-b border-gold-500/20 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-pink-500/10 rounded-lg border border-pink-500/30 text-pink-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-200 block truncate">
                Tu Enlace para la Biografía de Instagram:
              </span>
              <span className="text-[11px] font-mono text-gold-400 truncate block">
                {publicBookingUrl}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                copiedLink 
                  ? 'bg-emerald-500 text-slate-950' 
                  : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? '¡Link Copiado!' : 'Copiar para Bio'}</span>
            </button>

            <button
              onClick={() => setShowQRModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-dark-900/90 hover:bg-dark-800 text-slate-300 hover:text-gold-400 rounded-lg border border-dark-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Descargar QR para historias o stickers"
            >
              <QrCode className="w-3.5 h-3.5 text-gold-400" />
              <span className="hidden sm:inline">QR de Colecta</span>
            </button>

            <a
              href={publicBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-dark-900/90 hover:bg-dark-800 text-slate-300 hover:text-gold-400 rounded-lg border border-dark-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Abrir página pública"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Página</span>
            </a>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="p-4 border-b border-dark-800 bg-dark-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Todas', count: pickups.length },
              { id: 'pending', label: 'Pendientes', count: pickups.filter(p => p.status === 'pending').length },
              { id: 'confirmed', label: 'Confirmadas', count: pickups.filter(p => p.status === 'confirmed').length },
              { id: 'collected', label: 'Recolectadas', count: pickups.filter(p => p.status === 'collected').length },
              { id: 'cancelled', label: 'Canceladas', count: pickups.filter(p => p.status === 'cancelled').length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-gold-500 text-dark-950 shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                    : 'bg-dark-900 text-slate-400 hover:text-slate-200 border border-dark-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.id ? 'bg-dark-950/30 text-dark-950 font-extrabold' : 'bg-dark-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, colonia o folio..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-dark-950 border border-dark-700 focus:border-gold-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
            />
          </div>

        </div>

        {/* Pickups List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">Cargando solicitudes de colecta...</p>
            </div>
          ) : filteredPickups.length === 0 ? (
            <div className="py-16 text-center max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-dark-800 border border-dark-700 flex items-center justify-center text-slate-500 mx-auto mb-3">
                <Instagram className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">No hay solicitudes de colecta</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No se encontraron resultados para los filtros seleccionados.' 
                  : 'Comparte tu link en Instagram para que tus clientes agenden su recolección.'}
              </p>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Link de Colecta
              </button>
            </div>
          ) : (
            filteredPickups.map(pickup => {
              const status = STATUS_CONFIG[pickup.status] || STATUS_CONFIG.pending;
              const waClientLink = generatePickupWhatsAppClientLink(pickup);

              return (
                <div
                  key={pickup.id}
                  className="bg-dark-950/70 border border-dark-800 hover:border-gold-500/30 rounded-2xl p-4 sm:p-5 transition-all shadow-md space-y-4"
                >
                  {/* Top Row: Folio, Status, Date & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-gold-400 bg-gold-500/10 px-2.5 py-1 rounded-lg border border-gold-500/20">
                        #{pickup.request_number || 'COL'}
                      </span>
                      
                      {/* Status Dropdown */}
                      <select
                        value={pickup.status}
                        onChange={e => pickup.id && handleStatusChange(pickup.id, e.target.value as PickupStatus)}
                        className={`text-xs font-bold px-3 py-1 rounded-lg border outline-none cursor-pointer ${status.bg} ${status.text} ${status.border}`}
                      >
                        <option value="pending" className="bg-dark-900 text-amber-400">⏳ Pendiente</option>
                        <option value="confirmed" className="bg-dark-900 text-sky-400">🚗 Confirmada / En Ruta</option>
                        <option value="collected" className="bg-dark-900 text-emerald-400">✅ Recolectada / En Taller</option>
                        <option value="cancelled" className="bg-dark-900 text-rose-400">❌ Cancelada</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-medium bg-dark-900 px-2.5 py-1 rounded-lg border border-dark-800 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-gold-400" />
                        {pickup.preferred_date}
                      </span>
                      <span className="flex items-center gap-1 font-medium bg-dark-900 px-2.5 py-1 rounded-lg border border-dark-800 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-gold-400" />
                        {pickup.preferred_time_slot}
                      </span>
                    </div>
                  </div>

                  {/* Middle Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    
                    {/* Cliente & Contacto */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Cliente
                      </span>
                      <p className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                        {pickup.customer_name}
                      </p>
                      <p className="text-slate-300 flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        {pickup.customer_phone}
                      </p>
                    </div>

                    {/* Dirección & Referencias */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Dirección de Recolección
                      </span>
                      <p className="text-slate-200 font-medium flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>
                          {pickup.address}
                          {pickup.neighborhood && <span className="block text-slate-400">Col. {pickup.neighborhood}</span>}
                        </span>
                      </p>
                      {pickup.references && (
                        <p className="text-[11px] text-slate-400 italic">Ref: {pickup.references}</p>
                      )}
                    </div>

                    {/* Pares, Servicios & Fotos */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Artículos y Servicios
                      </span>
                      <p className="font-semibold text-gold-300 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                        {pickup.item_count} {pickup.item_count === 1 ? 'par / artículo' : 'pares / artículos'}
                      </p>
                      {pickup.services && pickup.services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pickup.services.map((s, idx) => (
                            <span key={idx} className="bg-dark-900 border border-dark-700 px-2 py-0.5 rounded text-[10px] text-slate-300">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {pickup.shoes_details && (
                        <p className="text-[11px] text-slate-300 mt-1">
                          <span className="text-slate-500">Detalles:</span> {pickup.shoes_details}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Notas y Fotos si existen */}
                  {(pickup.notes || (pickup.photos && pickup.photos.length > 0)) && (
                    <div className="bg-dark-900/60 p-3 rounded-xl border border-dark-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      {pickup.notes && (
                        <p className="text-slate-300 text-[11px]">
                          <span className="font-bold text-gold-400">Nota del cliente:</span> {pickup.notes}
                        </p>
                      )}

                      {pickup.photos && pickup.photos.length > 0 && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400">Fotos:</span>
                          {pickup.photos.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => setPreviewPhoto(url)}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-dark-700 hover:border-gold-400 transition-colors"
                            >
                              <img src={url} alt="Foto" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dark-800/80">
                    <button
                      onClick={() => handleDelete(pickup)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-xs flex items-center gap-1"
                      title="Eliminar solicitud"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* WhatsApp al Cliente para confirmar */}
                      <a
                        href={waClientLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                        <span>Confirmar por WhatsApp</span>
                      </a>

                      {/* Convertir a Pedido */}
                      <button
                        onClick={() => {
                          onConvertToOrder(pickup);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-slate-950 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.25)]"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Convertir a Pedido</span>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* MODAL QR DE COLECTA */}
      {showQRModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-dark-900 border border-gold-500/40 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-dark-700 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-gold-400" />
                Código QR de Colecta
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div id="pickup-qr-container" className="bg-dark-950 p-4 rounded-xl border border-dark-700 inline-block">
              <img src="/logo.svg" alt="Mr Clean" className="w-12 h-12 mx-auto mb-2 object-contain" />
              <p className="text-[10px] uppercase tracking-widest font-extrabold text-gold-400 mb-2">
                MR CLEAN SNEAKERS
              </p>
              <div className="bg-white p-3 rounded-lg inline-block border-2 border-gold-400">
                <QRCodeSVG
                  value={publicBookingUrl}
                  size={160}
                  bgColor="#FFFFFF"
                  fgColor="#07080A"
                  level="H"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Escanea para agendar recolección
              </p>
            </div>

            <p className="text-xs text-slate-400">
              Usa este QR en historias de Instagram, folletos o tarjetas para que tus clientes agenden su colecta.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleCopyLink}
                className="py-2 px-3 bg-dark-800 hover:bg-dark-700 text-slate-200 rounded-xl text-xs font-semibold border border-dark-700 flex items-center justify-center gap-1"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copiado' : 'Copiar URL'}
              </button>
              <button
                onClick={handleDownloadQR}
                disabled={downloadingQR}
                className="py-2 px-3 bg-gold-500 hover:bg-gold-400 text-dark-950 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingQR ? 'Descargando...' : 'Descargar QR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FOTO */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-lg w-full max-h-[80vh] flex items-center justify-center">
            <img src={previewPhoto} alt="Preview" className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-gold-500/40" />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-2 right-2 p-2 bg-dark-950/80 text-white rounded-full hover:bg-dark-900 border border-dark-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
