'use client';

import React, { useState } from 'react';
import { IMenuItem } from '@chai-partner/shared';
import { VegIndicator } from './Badge';
import { getFoodImage } from '@/lib/foodImages';
import { Plus, Minus, Sparkles, Check } from 'lucide-react';

export interface ProductCardProps {
  item: IMenuItem;
  qtyInCart: number;
  onAdd: () => void;
  onRemove: () => void;
  categoryName?: string;
  className?: string;
  layout?: 'row' | 'featured';
}

export function ProductCard({
  item,
  qtyInCart,
  onAdd,
  onRemove,
  categoryName = '',
  className = '',
  layout = 'row',
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const isAvailable = item.is_available !== false;
  const rawPrice = typeof item.price === 'number' ? item.price : parseFloat(String(item.price || 0));
  const displayPrice = !isNaN(rawPrice) ? rawPrice : 0;
  const foodImage = imageError ? '/images/menu/kulhad_chai.jpg' : getFoodImage({
    name: item.name,
    categoryName,
    image_url: item.image_url,
  });

  // Featured Hero Card layout (for Today's Favourites)
  if (layout === 'featured') {
    return (
      <div
        className={`group bg-white rounded-xl border border-divider/80 overflow-hidden transition-all duration-200 hover:border-gold/50 flex flex-col justify-between ${
          !isAvailable ? 'opacity-60 grayscale-[0.3]' : ''
        } ${className}`}
      >
        <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-canvas-warm">
          <img
            src={foodImage}
            alt={item.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-ink/90 text-white backdrop-blur-xs">
              <Sparkles className="w-3 h-3 text-gold" />
              Chef&apos;s Pick
            </span>
            <VegIndicator isVeg={item.veg_flag} />
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <h3 className="text-base font-bold text-ink leading-snug tracking-tight">
                {item.name}
              </h3>
              <span className="text-base font-bold text-ink font-mono flex-shrink-0">
                ₹{displayPrice.toFixed(0)}
              </span>
            </div>
            {item.description && (
              <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mb-3">
                {item.description}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-divider/40 flex items-center justify-between">
            <span className="text-[11px] text-ink-faint font-medium">
              {isAvailable ? 'Freshly made to order' : 'Sold out for today'}
            </span>

            {isAvailable ? (
              qtyInCart === 0 ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="h-8 px-4 bg-canvas-warm hover:bg-gold-pale hover:text-gold-deep border border-divider hover:border-gold/50 rounded-lg text-xs font-bold text-ink transition-all active:scale-95 inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              ) : (
                <div className="h-8 inline-flex items-center bg-gold-pale border border-gold-muted rounded-lg shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={onRemove}
                    className="w-8 h-full flex items-center justify-center text-gold-deep hover:bg-gold-muted/30 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2.5 text-xs font-bold text-ink font-mono">
                    {qtyInCart}
                  </span>
                  <button
                    type="button"
                    onClick={onAdd}
                    className="w-8 h-full flex items-center justify-center text-gold-deep hover:bg-gold-muted/30 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            ) : (
              <span className="text-xs font-medium text-ink-faint">Unavailable</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard Editorial Menu Item Row
  return (
    <article
      className={`group py-3.5 sm:py-4 border-b border-divider/60 flex items-start gap-3.5 sm:gap-5 transition-colors hover:bg-white/40 rounded-lg px-2 -mx-2 ${
        !isAvailable ? 'opacity-60' : ''
      } ${className}`}
    >
      {/* Real Food Image Thumbnail */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-canvas-warm flex-shrink-0 border border-divider/60 shadow-xs">
        <img
          src={foodImage}
          alt={item.name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center text-[10px] font-bold text-ink-faint uppercase tracking-wider">
            Sold Out
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <VegIndicator isVeg={item.veg_flag} />
            {item.is_bestseller && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-gold-pale text-gold-deep border border-gold-muted/60">
                Bestseller
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold text-ink tracking-tight leading-snug">
            {item.name}
          </h3>

          {item.description && (
            <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mt-0.5">
              {item.description}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between gap-3 mt-2.5 pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm sm:text-base font-bold text-ink font-mono">
              ₹{displayPrice.toFixed(0)}
            </span>
          </div>

          {isAvailable ? (
            qtyInCart === 0 ? (
              <button
                type="button"
                onClick={onAdd}
                className="h-8 px-3.5 bg-white hover:bg-gold-pale hover:text-gold-deep border border-divider hover:border-gold/60 rounded-lg text-xs font-bold text-ink transition-all active:scale-95 inline-flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            ) : (
              <div className="h-8 inline-flex items-center bg-gold-pale border border-gold-muted rounded-lg shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={onRemove}
                  className="w-7 h-full flex items-center justify-center text-gold-deep hover:bg-gold-muted/30 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="px-2 text-xs font-bold text-ink font-mono">
                  {qtyInCart}
                </span>
                <button
                  type="button"
                  onClick={onAdd}
                  className="w-7 h-full flex items-center justify-center text-gold-deep hover:bg-gold-muted/30 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )
          ) : (
            <span className="text-xs text-ink-faint font-medium">Sold Out</span>
          )}
        </div>
      </div>
    </article>
  );
}
