'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface QuantityStepperProps {
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QuantityStepper({
  qty,
  onIncrement,
  onDecrement,
  min = 0,
  max = 99,
  size = 'md',
  className = '',
}: QuantityStepperProps) {
  const sizeStyles = {
    sm: {
      btn: 'p-1.5',
      icon: 'w-3 h-3',
      text: 'text-xs min-w-[22px]',
      wrapper: 'rounded-lg',
    },
    md: {
      btn: 'p-2',
      icon: 'w-3.5 h-3.5',
      text: 'text-sm min-w-[28px]',
      wrapper: 'rounded-xl',
    },
    lg: {
      btn: 'p-2.5',
      icon: 'w-4 h-4',
      text: 'text-base min-w-[34px]',
      wrapper: 'rounded-xl',
    },
  }[size];

  return (
    <div
      className={`inline-flex items-center border border-gold/40 bg-gold-pale/80 shadow-sm ${sizeStyles.wrapper} overflow-hidden select-none transition-all ${className}`}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={qty <= min}
        aria-label="Decrease quantity"
        className={`${sizeStyles.btn} text-gold-deep hover:bg-gold hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold-deep active:scale-95`}
      >
        <Minus className={sizeStyles.icon} strokeWidth={2.2} />
      </button>

      <span
        className={`px-1.5 font-sans font-bold text-gold-deep text-center tabular-nums ${sizeStyles.text}`}
      >
        {qty}
      </span>

      <button
        type="button"
        onClick={onIncrement}
        disabled={qty >= max}
        aria-label="Increase quantity"
        className={`${sizeStyles.btn} text-gold-deep hover:bg-gold hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gold-deep active:scale-95`}
      >
        <Plus className={sizeStyles.icon} strokeWidth={2.2} />
      </button>
    </div>
  );
}
