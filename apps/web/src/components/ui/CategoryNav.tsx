'use client';

import React, { useRef } from 'react';
import { IMenuCategory } from '@chai-partner/shared';

export interface CategoryNavProps {
  categories: IMenuCategory[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function CategoryNav({
  categories,
  selectedCategoryId,
  onSelectCategory,
  className = '',
}: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <nav
      aria-label="Café Menu Categories"
      className={`relative w-full border-b border-divider/60 ${className}`}
    >
      <div
        ref={scrollRef}
        className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1"
      >
        {/* All Items Button */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-semibold tracking-tight transition-all select-none relative ${
            selectedCategoryId === 'all'
              ? 'text-gold-deep font-bold'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          <span>All Items</span>
          {selectedCategoryId === 'all' && (
            <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gold-deep rounded-full animate-fade-in" />
          )}
        </button>

        {/* Category List */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-semibold tracking-tight transition-all select-none relative ${
                isSelected
                  ? 'text-gold-deep font-bold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span>{cat.name}</span>
              {isSelected && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gold-deep rounded-full animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
