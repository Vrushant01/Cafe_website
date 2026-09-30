'use client';

import React from 'react';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  count?: number | string;
  action?: React.ReactNode;
  className?: string;
  serif?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  count,
  action,
  className = '',
  serif = true,
}: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-4 ${className}`}>
      <div>
        <div className="flex items-center gap-2.5">
          <h2
            className={`text-xl sm:text-2xl font-semibold text-ink leading-tight ${
              serif ? 'font-serif' : 'font-sans'
            }`}
            style={serif ? { fontFamily: 'Playfair Display, Georgia, serif' } : {}}
          >
            {title}
          </h2>
          {count !== undefined && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold-pale text-gold-deep border border-gold-muted font-bold font-mono">
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-ink-faint mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
