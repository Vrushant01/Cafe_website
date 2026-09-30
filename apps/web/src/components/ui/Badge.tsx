'use client';

import React from 'react';
import { OrderStatus, TableStatus } from '@chai-partner/shared';
import { Flame, Clock, CheckCircle2, ChefHat, Sparkles, AlertCircle } from 'lucide-react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'ok' | 'warn' | 'danger' | 'sage' | 'ink' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  icon,
  className = '',
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 rounded-full gap-1.5 font-semibold',
  }[size];

  const variantStyles = {
    gold: 'bg-gold-pale text-gold-deep border border-gold-muted',
    ok: 'bg-ok-bg text-ok border border-ok-border',
    warn: 'bg-warn-bg text-warn border border-warn-border',
    danger: 'bg-danger-bg text-danger border border-danger-border',
    sage: 'bg-sage-light text-sage-dark border border-sage/20',
    ink: 'bg-ink/5 text-ink-muted border border-ink/10',
    neutral: 'bg-canvas-warm text-ink-muted border border-divider',
  }[variant];

  return (
    <span
      className={`inline-flex items-center tracking-tight leading-none ${sizeStyles} ${variantStyles} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

export function VegIndicator({ isVeg }: { isVeg: boolean }) {
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
      className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 bg-white ${
        isVeg ? 'border-ok' : 'border-danger'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${isVeg ? 'bg-ok' : 'bg-danger'}`}
      />
    </span>
  );
}

export function BestsellerBadge({ className = '' }: { className?: string }) {
  return (
    <Badge
      variant="warn"
      size="sm"
      icon={<Flame className="w-3 h-3 text-warn" />}
      className={`!bg-[#FFF4E6] !text-[#B45309] !border-[#FCD34D] font-bold tracking-wider ${className}`}
    >
      BESTSELLER
    </Badge>
  );
}

export function TableStatusBadge({ status }: { status: TableStatus }) {
  const isAvailable = status === TableStatus.AVAILABLE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        isAvailable
          ? 'bg-ok-bg text-ok border border-ok-border'
          : 'bg-danger-bg text-danger border border-danger-border'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isAvailable ? 'bg-ok pulse-live' : 'bg-danger'
        }`}
      />
      <span>{isAvailable ? 'Available' : 'Occupied'}</span>
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case OrderStatus.PLACED:
      return (
        <Badge variant="warn" icon={<Clock className="w-3 h-3" />}>
          New Order
        </Badge>
      );
    case OrderStatus.ACCEPTED:
      return (
        <Badge variant="sage" icon={<CheckCircle2 className="w-3 h-3" />}>
          Accepted
        </Badge>
      );
    case OrderStatus.PREPARING:
      return (
        <Badge variant="gold" icon={<ChefHat className="w-3 h-3" />}>
          Preparing
        </Badge>
      );
    case OrderStatus.READY:
      return (
        <Badge variant="ok" icon={<Sparkles className="w-3 h-3" />}>
          Ready for Pickup
        </Badge>
      );
    case OrderStatus.SERVED:
      return (
        <Badge variant="ink" icon={<CheckCircle2 className="w-3 h-3" />}>
          Served
        </Badge>
      );
    case OrderStatus.BILLED:
      return (
        <Badge variant="sage" icon={<CheckCircle2 className="w-3 h-3" />}>
          Settled
        </Badge>
      );
    case OrderStatus.CANCELLED:
      return (
        <Badge variant="danger" icon={<AlertCircle className="w-3 h-3" />}>
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
