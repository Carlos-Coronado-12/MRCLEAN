import React from 'react';
import { OrderStatus, PaymentStatus } from '../types/database';
import { Clock, RefreshCw, CheckCircle2, PackageCheck, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const STATUS_CONFIG: Record<OrderStatus, { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }> = {
  received: {
    label: 'Recibido',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: Clock,
  },
  in_progress: {
    label: 'En Proceso',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    icon: RefreshCw,
  },
  ready: {
    label: 'Listo',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  delivered: {
    label: 'Entregado',
    bg: 'bg-purple-500/10',
    text: 'text-purple-300',
    border: 'border-purple-500/30',
    icon: PackageCheck,
  },
  cancelled: {
    label: 'Cancelado',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: XCircle,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.received;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3.5 py-1.5 text-base gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      <Icon className={`w-3.5 h-3.5 ${status === 'in_progress' ? 'animate-spin-slow' : ''}`} />
      {config.label}
    </span>
  );
};

export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const config = {
    paid: { label: 'Pagado', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    pending: { label: 'Pendiente', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    partial: { label: 'Abono Parcial', bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  }[status] || { label: status, bg: 'bg-slate-800 text-slate-400 border-slate-700' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${config.bg}`}>
      {config.label}
    </span>
  );
};
