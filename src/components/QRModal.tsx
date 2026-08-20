import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types/database';
import { X, Printer, Copy, Check, ExternalLink } from 'lucide-react';
import { STATUS_CONFIG } from './StatusBadge';

interface QRModalProps {
  order: Order;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ order, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const publicUrl = `${window.location.origin}/pedido/${order.public_token}`;
  const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-dark-900 border border-gold-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-gold-glow">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-950/50">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Código QR de Pedido
            </h3>
            <p className="text-xs text-gold-400 font-mono">#{order.order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Printable area) */}
        <div className="p-6 text-center space-y-4" id="printable-qr-area">
          <div className="bg-dark-950 p-4 rounded-xl border border-dark-700 max-w-xs mx-auto">
            <img src="/logo.svg" alt="Mr Clean Sneakers" className="w-16 h-16 mx-auto mb-2 object-contain" />
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gold-400 mb-0.5 font-serif">MR CLEAN SNEAKERS</p>
            <p className="text-base font-extrabold text-white mb-3 font-mono">Orden #{order.order_number}</p>
            
            {/* QR SVG */}
            <div className="bg-white p-4 rounded-xl inline-block shadow-lg border-2 border-gold-400">
              <QRCodeSVG
                value={publicUrl}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#07080A"
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mt-3 text-left space-y-1 text-xs border-t border-dark-700 pt-3">
              <p className="text-slate-300"><strong>Cliente:</strong> {order.customer_name}</p>
              <p className="text-slate-300"><strong>Tel:</strong> {order.customer_phone}</p>
              <p className="text-slate-300"><strong>Estado:</strong> <span className={statusInfo.text}>{statusInfo.label}</span></p>
              <p className="text-slate-300"><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Escanea este QR para ver el avance y fotos en tiempo real.
          </p>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-mono bg-dark-950 py-2 px-3 rounded-lg border border-dark-700 truncate">
            <span className="truncate">{publicUrl}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-dark-950 border-t border-dark-700 flex flex-wrap gap-2 justify-end">
          <button
            onClick={handleCopy}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-dark-800 hover:bg-dark-700 rounded-lg border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Copiado!' : 'Copiar Link'}
          </button>
          
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 rounded-lg border border-gold-500/30 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir
          </a>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 rounded-lg shadow-gold-glow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir Recibo / QR
          </button>
        </div>

      </div>
    </div>
  );
};
