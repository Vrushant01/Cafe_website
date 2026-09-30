'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  changePercent?: number;
  icon?: React.ReactNode;
  variant?: 'gold' | 'espresso' | 'neutral';
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  changePercent,
  icon,
  variant = 'neutral',
  className = '',
}: MetricCardProps) {
  const isPositive = changePercent !== undefined ? changePercent >= 0 : undefined;

  return (
    <div
      className={`bg-white border border-divider rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-gold/30 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-canvas-warm border border-divider/80 flex items-center justify-center text-gold">
            {icon}
          </div>
        )}
      </div>

      <div className="my-1">
        <div
          className="text-2xl sm:text-3xl font-serif font-bold text-ink leading-tight"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          {value}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-divider-subtle">
        {changePercent !== undefined ? (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              isPositive ? 'text-ok' : 'text-danger'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {changePercent}%
            </span>
          </span>
        ) : (
          <span className="text-ink-faint">{subtext}</span>
        )}

        {subtext && changePercent !== undefined && (
          <span className="text-[11px] text-ink-faint">{subtext}</span>
        )}
      </div>
    </div>
  );
}
