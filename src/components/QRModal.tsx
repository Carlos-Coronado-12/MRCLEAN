import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types/database';
import { generateWhatsAppLink } from '../services/orderService';
import { WhatsAppIcon } from './WhatsAppIcon';
import { X, Printer, Copy, Check, ExternalLink, Download } from 'lucide-react';
import { STATUS_CONFIG } from './StatusBadge';

interface QRModalProps {
  order: Order;
  onClose: () => void;
}

export const QRModal: React.FC<QRModalProps> = ({ order, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
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

  const handleDownloadQR = () => {
    setDownloading(true);
    try {
      const svg = document.querySelector('#printable-qr-area svg') as SVGElement;
      if (!svg) {
        setDownloading(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const padding = 40;
        const textHeight = 60;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2 + textHeight;

        if (ctx) {
          // Fondo blanco
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Encabezado
          ctx.fillStyle = '#07080A';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`MR CLEAN SNEAKERS`, canvas.width / 2, 28);
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#555555';
          ctx.fillText(`Orden #${order.order_number} - ${order.customer_name}`, canvas.width / 2, 46);

          // Dibujar QR SVG
          ctx.drawImage(img, padding, 60);

          // Pie de página
          ctx.fillStyle = '#777777';
          ctx.font = '10px monospace';
          ctx.fillText(`Escanea para ver avance en vivo`, canvas.width / 2, canvas.height - 15);

          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `QR-Orden-${order.order_number}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
        setDownloading(false);
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Error al descargar QR:', err);
      setDownloading(false);
    }
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
              {order.payment_status === 'partial' && (
                <>
                  <p className="text-cyan-400"><strong>Abonado:</strong> ${(order.paid_amount || 0).toFixed(2)}</p>
                  <p className="text-amber-400 font-bold"><strong>Resta por pagar:</strong> ${Math.max(0, order.total_amount - (order.paid_amount || 0)).toFixed(2)}</p>
                </>
              )}
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
        <div className="px-6 py-4 bg-dark-950 border-t border-dark-700 grid grid-cols-2 gap-2">
          
          {/* Botón WhatsApp */}
          <a
            href={generateWhatsAppLink(order, 'custom')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-black bg-emerald-500 hover:bg-emerald-400 rounded-lg shadow-sm transition-all col-span-2 sm:col-span-1"
          >
            <WhatsAppIcon className="w-4 h-4 fill-slate-950" />
            Enviar por WhatsApp
          </a>

          {/* Botón Descargar Imagen QR PNG */}
          <button
            type="button"
            onClick={handleDownloadQR}
            disabled={downloading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-dark-800 hover:bg-dark-700 rounded-lg border border-slate-700 transition-colors col-span-2 sm:col-span-1"
          >
            <Download className="w-4 h-4 text-gold-400" />
            {downloading ? 'Generando...' : 'Descargar Imagen QR'}
          </button>

          {/* Copiar Link */}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-dark-800 hover:bg-dark-700 rounded-lg border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Copiado!' : 'Copiar Link'}
          </button>

          {/* Imprimir */}
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 rounded-lg shadow-gold-glow-sm transition-all"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>

        </div>

      </div>
    </div>
  );
};
