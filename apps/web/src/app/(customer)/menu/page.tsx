'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { IMenuCategory, IMenuItem } from '@chai-partner/shared';
import { ProductCard } from '@/components/ui/ProductCard';
import { CategoryNav } from '@/components/ui/CategoryNav';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Coffee,
  Search,
  X,
  ShoppingBag,
  ArrowRight,
  Clock,
  Sparkles,
  UtensilsCrossed,
  ClipboardList,
} from 'lucide-react';
import { ExitButton } from '@/components/ui/ExitButton';

export default function MenuPage() {
  const router = useRouter();
  const { items: cartItems, addItem, removeItem, totalQuantity, grandTotal } = useCart();

  const [categories, setCategories] = useState<IMenuCategory[]>([]);
  const [items, setItems] = useState<IMenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [tableNumber, setTableNumber] = useState('1');
  const [customerName, setCustomerName] = useState('Guest');
  const [sessionOrderIds, setSessionOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTable = localStorage.getItem('cp_table_number');
      const storedName = localStorage.getItem('cp_customer_name');
      const storedOrders = localStorage.getItem('cp_session_order_ids');
      if (storedTable) setTableNumber(storedTable);
      if (storedName) setCustomerName(storedName);
      if (storedOrders) {
        try {
          setSessionOrderIds(JSON.parse(storedOrders));
        } catch {}
      }
    }

    async function loadData() {
      try {
        setLoading(true);
        const [cats, menuData] = await Promise.all([
          apiFetch<IMenuCategory[]>('/menu/categories'),
          apiFetch<any>('/menu'),
        ]);

        let flattenedItems: IMenuItem[] = [];
        let parsedCategories: IMenuCategory[] = (cats && cats.length > 0) ? cats : [];

        if (Array.isArray(menuData)) {
          if (menuData.length > 0 && Array.isArray(menuData[0]?.items)) {
            // /menu returns categories with nested items: [{ id, name, sort_order, items: [...] }]
            if (!parsedCategories.length) {
              parsedCategories = menuData.map((c: any) => ({
                id: c.id,
                name: c.name,
                sort_order: c.sort_order,
              }));
            }
            menuData.forEach((cat: any) => {
              if (Array.isArray(cat.items)) {
                cat.items.forEach((item: any) => {
                  flattenedItems.push({
                    ...item,
                    category_id: item.category_id || cat.id,
                  });
                });
              }
            });
          } else {
            // Fallback if flat list
            flattenedItems = menuData;
          }
        }

        setCategories(parsedCategories);
        setItems(flattenedItems);
      } catch (err) {
        console.error('Failed to load menu data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getItemCartQty = (itemId: string) => {
    const found = cartItems.find((i) => i.id === itemId);
    return found ? found.qty : 0;
  };

  const getCategoryNameForItem = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || '';
  };

  // Filter items based on active category & search keyword
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category_id === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Extract top 2-3 bestsellers for "Today's Favourites" feature
  const featuredItems = useMemo(() => {
    return items.filter((item) => item.is_bestseller).slice(0, 3);
  }, [items]);

  // Group items by category for editorial section flow
  const itemsByCategory = useMemo(() => {
    if (selectedCategory !== 'all') {
      const activeCat = categories.find((c) => c.id === selectedCategory);
      return [{
        category: activeCat || { id: selectedCategory, name: 'Selections', sort_order: 1 },
        items: filteredItems,
      }];
    }

    // When "All" is active, group all filtered items by their categories
    const groups: { category: IMenuCategory; items: IMenuItem[] }[] = [];
    for (const cat of categories) {
      const catItems = filteredItems.filter((i) => i.category_id === cat.id);
      if (catItems.length > 0) {
        groups.push({ category: cat, items: catItems });
      }
    }

    // If any orphan items without matched categories
    const orphanItems = filteredItems.filter(
      (i) => !categories.some((c) => c.id === i.category_id),
    );
    if (orphanItems.length > 0) {
      groups.push({
        category: { id: 'other', name: 'More Delights', sort_order: 999 },
        items: orphanItems,
      });
    }

    return groups;
  }, [filteredItems, selectedCategory, categories]);

  // First item in cart for quick tray summary
  const primaryCartItem = cartItems[0];

  return (
    <div className="min-h-screen bg-canvas text-ink pb-28">
      {/* ── Compact Brand Header ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-divider/70 px-4 sm:px-6 py-2.5 transition-all shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-canvas-warm border border-gold/30 flex items-center justify-center text-gold-deep shadow-xs flex-shrink-0">
              <Coffee className="w-4 h-4" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-serif font-bold text-ink text-base tracking-tight leading-none"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  Chai Partner
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold-deep bg-gold-pale px-2 py-0.5 rounded border border-gold-muted/60">
                  Table {tableNumber}
                </span>
              </div>
              <p className="text-[11px] text-ink-muted leading-none mt-0.5 truncate">
                Welcome, <span className="font-semibold text-ink">{customerName}</span>
              </p>
            </div>
          </div>

          {/* Right Status & Cart Button */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-md text-[11px] font-medium text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span>Active session</span>
            </div>
            <ExitButton />

            {sessionOrderIds.length > 0 && (
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="h-8 px-3 rounded-lg bg-canvas-warm hover:bg-canvas border border-divider text-ink text-xs font-semibold flex items-center gap-2 transition-all shadow-xs active:scale-95"
              >
                <ClipboardList className="w-3.5 h-3.5 text-gold-deep" />
                <span className="hidden sm:inline">My Orders</span>
              </button>
            )}

            {totalQuantity > 0 && (
              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="h-8 px-3 rounded-lg bg-ink hover:bg-black text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs active:scale-95"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>₹{grandTotal}</span>
                <span className="w-4 h-4 rounded-full bg-gold text-[10px] font-bold flex items-center justify-center text-white">
                  {totalQuantity}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">

        {/* ── Editorial Introduction (Compact) ── */}
        {!searchQuery && (
          <section className="mb-6 pt-1 pb-4 border-b border-divider/60 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-ink tracking-tight"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Good food. Good chai. Good company.
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted mt-1.5 max-w-xl leading-relaxed">
                Freshly brewed chais, artisanal coffees, and comforting kitchen bites crafted to order. Take your time and savor the moment.
              </p>
            </div>

            {/* Integrated Refined Search Control */}
            <div className="relative w-full md:w-72 flex-shrink-0">
              <Search className="w-4 h-4 text-ink-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-divider rounded-xl text-xs sm:text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-faint hover:text-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </section>
        )}

        {/* Search Active Banner */}
        {searchQuery && (
          <div className="mb-6 flex items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-divider/80 shadow-xs">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gold-deep" />
              <span className="text-xs sm:text-sm text-ink font-medium">
                Searching for "<span className="font-bold text-ink">{searchQuery}</span>"
              </span>
              <span className="text-xs text-ink-faint font-mono">
                ({filteredItems.length} {filteredItems.length === 1 ? 'match' : 'matches'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-gold-deep hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* ── Category Navigation Rail ── */}
        <div className="sticky top-[53px] z-20 bg-canvas/95 backdrop-blur-md pt-1 pb-3 mb-6">
          <CategoryNav
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* ── Today's Favourites (Featured Bestsellers) ── */}
        {!searchQuery && selectedCategory === 'all' && featuredItems.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-gold-deep rounded-full" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-ink font-sans">
                  Today's Favourites
                </h2>
              </div>
              <span className="text-xs text-ink-faint">Café Bestsellers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {featuredItems.map((item) => (
                <ProductCard
                  key={`feat-${item.id}`}
                  item={item}
                  qtyInCart={getItemCartQty(item.id)}
                  categoryName={getCategoryNameForItem(item.category_id)}
                  layout="featured"
                  onAdd={() =>
                    addItem({
                      id: item.id,
                      name: item.name,
                      price: Number(item.price),
                      veg_flag: item.veg_flag,
                    })
                  }
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Main Menu Sections ── */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="py-4 border-b border-divider/60 animate-pulse flex items-start gap-4">
                <div className="w-20 h-20 rounded-xl bg-canvas-warm flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-canvas-warm rounded w-1/3" />
                  <div className="h-3 bg-canvas-warm rounded w-2/3" />
                  <div className="h-4 bg-canvas-warm rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title="No Items Found"
            description={
              searchQuery
                ? `No dishes or drinks match "${searchQuery}". Try a different keyword.`
                : 'No items are currently active in this category.'
            }
            action={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-ink text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
                >
                  Clear Search
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-10">
            {itemsByCategory.map(({ category, items: catItems }) => (
              <section key={category.id} className="scroll-mt-32">
                {/* Section Title Header */}
                <div className="flex items-baseline justify-between border-b border-ink/15 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-ink font-sans">
                      {category.name}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-ink-faint">
                    {catItems.length} {catItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* 2-Column Responsive Editorial Menu Rows */}
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
                  {catItems.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      qtyInCart={getItemCartQty(item.id)}
                      categoryName={category.name}
                      layout="row"
                      onAdd={() =>
                        addItem({
                          id: item.id,
                          name: item.name,
                          price: Number(item.price),
                          veg_flag: item.veg_flag,
                        })
                      }
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* ── Refined Restaurant Sticky Order Tray ── */}
      {totalQuantity > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto pointer-events-none animate-slide-down">
          <div className="bg-ink text-white rounded-xl px-4 py-3 shadow-xl border border-white/10 flex items-center justify-between gap-3 pointer-events-auto backdrop-blur-md">
            {/* Order Summary Info */}
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-white/80">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                </span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-sm font-bold text-white font-mono">
                  ₹{grandTotal}
                </span>
              </div>
              <p className="text-[11px] text-white/60 truncate mt-0.5 font-medium">
                {primaryCartItem?.name}
                {totalQuantity > 1 && ` + ${totalQuantity - 1} more`}
              </p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={() => router.push('/checkout')}
              className="h-9 px-4 bg-gold hover:bg-gold-deep text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 flex-shrink-0"
            >
              <span>View Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
