'use client';

import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search artisan chai, freshly grilled sandwiches, snacks...',
  className = '',
}: SearchBarProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <Search
        className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        strokeWidth={1.8}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2.5 bg-white border border-divider rounded-xl text-sm text-ink placeholder-ink-faint shadow-xs focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-ink rounded-md transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
