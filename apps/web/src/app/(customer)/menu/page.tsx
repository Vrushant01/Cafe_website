'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { IMenuCategory, IMenuItem } from '@chai-partner/shared';
import {
  Coffee,
  Search,
  ShoppingBag,
  Sparkles,
  Plus,
  Minus,
  Clock,
  ArrowRight,
  Flame,
  Check,
} from 'lucide-react';

export default function MenuPage() {
  const router = useRouter();
  const { items: cartItems, addItem, removeItem, totalQuantity, grandTotal } = useCart();

  const [categories, setCategories] = useState<IMenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');

  useEffect(() => {
    const storedName = localStorage.getItem('cp_customer_name') || 'Guest';
    const storedTable = localStorage.getItem('cp_table_number') || '1';
    setCustomerName(storedName);
    setTableNumber(storedTable);

    const fetchMenu = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<IMenuCategory[]>('/menu');
        setCategories(data);
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // Filter items based on active category and search
  const allItems: IMenuItem[] = categories.flatMap((cat) => cat.items || []);
  const filteredItems = (selectedCategory === 'all'
    ? allItems
    : categories.find((c) => c.id === selectedCategory)?.items || []
  ).filter((item) => {
    if (!searchQuery.trim()) return true;
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getItemCartQty = (itemId: string) => {
    const found = cartItems.find((i) => i.id === itemId);
    return found ? found.qty : 0;
  };

  return (
    <div className="min-h-screen bg-cream pb-32 max-w-2xl mx-auto">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-cream-dark/80 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-surface rounded-xl flex items-center justify-center border border-terracotta/20 text-terracotta shadow-xs">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-serif font-bold text-coffee leading-tight">Chai Partner</h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-sage">
                <span className="text-terracotta font-bold">Table {tableNumber}</span>
                <span>•</span>
                <span>{customerName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface border border-cream-dark rounded-full text-xs font-medium text-coffee">
            <Clock className="w-3.5 h-3.5 text-warning" />
            <span>2h Session Active</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-coffee/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Masala Chai, Maggi, Nachos, Pizza..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-cream-dark rounded-xl text-xs sm:text-sm text-coffee placeholder-coffee/40 focus:outline-none focus:ring-2 focus:ring-terracotta font-medium"
          />
        </div>

        {/* Category Horizontal Scroll Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 pb-1 -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedCategory === 'all'
                ? 'bg-terracotta text-surface shadow-xs'
                : 'bg-surface text-coffee border border-cream-dark hover:bg-cream'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-terracotta text-surface shadow-xs'
                  : 'bg-surface text-coffee border border-cream-dark hover:bg-cream'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Main Menu Grid */}
      <main className="p-4">
        {loading ? (
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="bg-surface rounded-2xl p-4 animate-pulse h-28 border border-cream-dark"></div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Coffee className="w-10 h-10 text-sage mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-coffee">No items found</p>
            <p className="text-xs text-coffee/60 mt-1">Try another category or search term</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredItems.map((item) => {
              const qty = getItemCartQty(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-surface border rounded-2xl p-4 shadow-xs flex items-start justify-between gap-3 transition-all ${
                    !item.is_available
                      ? 'opacity-60 border-cream-dark'
                      : 'border-terracotta/15 hover:border-terracotta/40'
                  }`}
                >
                  {/* Left: Item Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Veg Indicator */}
                      <span className="w-4 h-4 border border-success rounded-xs flex items-center justify-center p-0.5">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                      </span>

                      {item.is_bestseller && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-warning-light text-warning border border-warning/30 rounded-full">
                          <Flame className="w-3 h-3 text-warning" />
                          <span>BESTSELLER</span>
                        </span>
                      )}

                      {!item.is_available && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-error-light text-error rounded-full">
                          Sold Out
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-coffee leading-snug">{item.name}</h3>
                    <p className="text-xs text-coffee/70 line-clamp-2 mt-1 leading-relaxed font-normal">
                      {item.description}
                    </p>
                    <div className="text-sm font-bold text-coffee mt-2">₹{item.price}</div>
                  </div>

                  {/* Right: Add to Cart Stepper */}
                  <div className="flex-shrink-0 pt-2">
                    {item.is_available ? (
                      qty > 0 ? (
                        <div className="flex items-center bg-cream border border-terracotta/30 rounded-xl overflow-hidden shadow-xs">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-coffee hover:bg-terracotta hover:text-surface transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-bold text-coffee min-w-[24px] text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() =>
                              addItem({
                                id: item.id,
                                name: item.name,
                                price: Number(item.price),
                                veg_flag: item.veg_flag,
                              })
                            }
                            className="p-2 text-coffee hover:bg-terracotta hover:text-surface transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            addItem({
                              id: item.id,
                              name: item.name,
                              price: Number(item.price),
                              veg_flag: item.veg_flag,
                            })
                          }
                          className="px-5 py-2 bg-cream hover:bg-terracotta hover:text-surface text-coffee border border-terracotta/40 rounded-xl text-xs font-bold transition-all shadow-xs uppercase tracking-wider"
                        >
                          ADD +
                        </button>
                      )
                    ) : (
                      <span className="text-xs font-semibold text-coffee/40 py-2 px-3 block">
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Cart Bar */}
      {totalQuantity > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-cream via-cream to-transparent z-40 max-w-2xl mx-auto">
          <div className="bg-coffee text-surface rounded-2xl p-3.5 shadow-xl flex items-center justify-between border border-terracotta/40">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 rounded-xl bg-terracotta flex items-center justify-center text-surface shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-cream/70 font-medium">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
                </div>
                <div className="text-base font-bold text-surface">₹{grandTotal} <span className="text-[10px] font-normal text-cream/60">(inc. GST)</span></div>
              </div>
            </div>

            <button
              onClick={() => router.push('/checkout')}
              className="flex items-center gap-2 py-2.5 px-5 bg-terracotta hover:bg-terracotta-hover text-surface rounded-xl font-bold text-sm transition-colors shadow-sm"
            >
              <span>View Cart</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
