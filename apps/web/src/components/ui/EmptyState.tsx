'use client';

import React from 'react';
import { Coffee } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`text-center py-14 px-6 bg-white border border-divider rounded-2xl shadow-xs max-w-md mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-canvas-warm border border-divider flex items-center justify-center mx-auto mb-4 text-gold">
        {icon || <Coffee className="w-7 h-7" strokeWidth={1.5} />}
      </div>

      <h3
        className="text-lg font-serif font-semibold text-ink mb-1.5"
        style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
      >
        {title}
      </h3>

      {description && (
        <p className="text-xs sm:text-sm text-ink-faint leading-relaxed max-w-xs mx-auto mb-5">
          {description}
        </p>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
