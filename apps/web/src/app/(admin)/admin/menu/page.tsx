'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  IMenuCategory,
  IMenuItem,
  AdminRole,
  CreateMenuItemDto,
  UpdateMenuItemDto,
} from '@chai-partner/shared';
import {
  Search,
  Plus,
  Star,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Tag,
  ShieldAlert,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export default function AdminMenuPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<IMenuCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'unavailable' | 'bestsellers'>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [priceEditItem, setPriceEditItem] = useState<IMenuItem | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [editItem, setEditItem] = useState<IMenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<IMenuItem | null>(null);

  // Form state for Add/Edit
  const [formData, setFormData] = useState<Partial<CreateMenuItemDto>>({
    name: '',
    category_id: '',
    price: 0,
    description: '',
    is_available: true,
    is_bestseller: false,
    veg_flag: true,
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<IMenuCategory[]>('/menu');
      setCategories(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load menu data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem('cp_admin_user');
    if (!rawUser) {
      router.push('/admin/login');
      return;
    }
    try {
      setCurrentUser(JSON.parse(rawUser));
    } catch {}

    fetchMenu();
  }, []);

  const isAdmin = currentUser?.role?.toLowerCase() === AdminRole.ADMIN;
  const isKitchen = currentUser?.role?.toLowerCase() === AdminRole.KITCHEN;
  const canToggleAvailability = isAdmin || isKitchen;

  // Flatten all items with category info
  const allItems: Array<IMenuItem & { category_name: string }> = categories.flatMap((cat) =>
    (cat.items || []).map((item) => ({
      ...item,
      category_name: cat.name,
    })),
  );

  // Filter items
  const filteredItems = allItems.filter((item) => {
    // Category filter
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
      return false;
    }
    // Mode filter
    if (filterMode === 'available' && !item.is_available) return false;
    if (filterMode === 'unavailable' && item.is_available) return false;
    if (filterMode === 'bestsellers' && !item.is_bestseller) return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCat = item.category_name.toLowerCase().includes(q);
      return matchName || matchDesc || matchCat;
    }

    return true;
  });

  // Toggle Availability
  const handleToggleAvailability = async (item: IMenuItem) => {
    if (!canToggleAvailability) {
      setNotification({ type: 'error', message: 'Only Admin and Kitchen staff can toggle item availability' });
      return;
    }
    try {
      setActionLoading(true);
      await apiFetch(`/menu/items/${item.id}/availability`, { method: 'PATCH' });
      setNotification({
        type: 'success',
        message: `"${item.name}" marked as ${!item.is_available ? 'Available' : 'Unavailable (86\'d)'}`,
      });
      await fetchMenu();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Bestseller
  const handleToggleBestseller = async (item: IMenuItem) => {
    if (!isAdmin) {
      setNotification({ type: 'error', message: 'Only Admin can toggle bestseller status' });
      return;
    }
    try {
      setActionLoading(true);
      await apiFetch(`/menu/items/${item.id}/bestseller`, { method: 'PATCH' });
      setNotification({
        type: 'success',
        message: `"${item.name}" bestseller flag updated`,
      });
      await fetchMenu();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Price Edit Submit
  const handlePriceUpdate = async () => {
    if (!priceEditItem) return;
    const parsed = parseFloat(newPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid positive price' });
      return;
    }
    try {
      setActionLoading(true);
      await apiFetch(`/menu/items/${priceEditItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ price: parsed }),
      });
      setNotification({
        type: 'success',
        message: `Updated price for "${priceEditItem.name}" from ₹${priceEditItem.price} to ₹${parsed} (logged to audit log)`,
      });
      setPriceEditItem(null);
      setNewPrice('');
      await fetchMenu();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Add Item Submit
  const handleAddItem = async () => {
    if (!formData.name || !formData.name.trim()) {
      setNotification({ type: 'error', message: 'Item name is required' });
      return;
    }
    if (!formData.category_id) {
      setNotification({ type: 'error', message: 'Please select a category' });
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      setNotification({ type: 'error', message: 'Please enter a valid positive price' });
      return;
    }
    try {
      setActionLoading(true);
      await apiFetch('/menu/items', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
        }),
      });
      setNotification({
        type: 'success',
        message: `Added new item "${formData.name}" successfully`,
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        price: 0,
        description: '',
        is_available: true,
        is_bestseller: false,
        veg_flag: true,
      });
      await fetchMenu();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Item Details Submit
  const handleEditItem = async () => {
    if (!editItem) return;
    try {
      setActionLoading(true);
      await apiFetch(`/menu/items/${editItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editItem.name,
          category_id: editItem.category_id,
          description: editItem.description,
          price: Number(editItem.price),
          veg_flag: editItem.veg_flag,
          is_bestseller: editItem.is_bestseller,
          is_available: editItem.is_available,
        }),
      });
      setNotification({
        type: 'success',
        message: `Updated details for "${editItem.name}"`,
      });
      setEditItem(null);
      await fetchMenu();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Item Submit
  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    try {
      setActionLoading(true);
      await apiFetch(`/menu/items/${deleteItem.id}`, { method: 'DELETE' });
      setNotification({
        type: 'success',
        message: `Deleted "${deleteItem.name}" from menu`,
      });
      setDeleteItem(null);
      await fetchMenu();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-6 md:px-8 max-w-7xl mx-auto">
      <AdminHeader activeTab="menu" onRefresh={fetchMenu} />

      {/* Role permission info banner */}
      {!isAdmin && (
        <div className="mb-4 p-3.5 bg-surface border border-cream-dark rounded-xl flex items-center gap-3 text-xs text-coffee/80 shadow-xs">
          <ShieldAlert className="w-4 h-4 text-terracotta flex-shrink-0" />
          <span>
            {isKitchen
              ? 'Kitchen Staff view: You can toggle availability (86’d items). Editing prices or adding items requires an Admin account.'
              : 'Cashier view: Menu items are in read-only view. Menu changes require an Admin account.'}
          </span>
        </div>
      )}

      {/* Notification banner */}
      {notification && (
        <div
          className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
            notification.type === 'success'
              ? 'bg-success-light border-success/30 text-success'
              : 'bg-error-light border-error/30 text-error'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar: Search, Category Filters, Add Item */}
      <section className="bg-surface border border-cream-dark/60 rounded-2xl p-4 shadow-xs mb-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-coffee/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by item name, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-cream/40 border border-cream-dark rounded-xl text-xs text-coffee placeholder-coffee/40 focus:outline-none focus:border-terracotta"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee/40 hover:text-coffee"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters & Add Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-cream/40 border border-cream-dark rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterMode === 'all' ? 'bg-surface text-coffee shadow-xs' : 'text-coffee/60 hover:text-coffee'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('available')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterMode === 'available' ? 'bg-surface text-success shadow-xs' : 'text-coffee/60 hover:text-coffee'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setFilterMode('unavailable')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterMode === 'unavailable' ? 'bg-surface text-error shadow-xs' : 'text-coffee/60 hover:text-coffee'
                }`}
              >
                Unavailable
              </button>
              <button
                onClick={() => setFilterMode('bestsellers')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterMode === 'bestsellers' ? 'bg-surface text-amber shadow-xs' : 'text-coffee/60 hover:text-coffee'
                }`}
              >
                ★ Bestsellers
              </button>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setFormData({
                    name: '',
                    category_id: categories[0]?.id || '',
                    price: 50,
                    description: '',
                    is_available: true,
                    is_bestseller: false,
                    veg_flag: true,
                  });
                  setShowAddModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-terracotta text-cream rounded-xl text-xs font-bold hover:bg-terracotta/90 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-coffee text-cream shadow-xs'
                : 'bg-cream/50 text-coffee/70 hover:bg-cream border border-cream-dark'
            }`}
          >
            All Categories ({allItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-coffee text-cream shadow-xs'
                  : 'bg-cream/50 text-coffee/70 hover:bg-cream border border-cream-dark'
              }`}
            >
              {cat.name} ({cat.items?.length || 0})
            </button>
          ))}
        </div>
      </section>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="text-center py-16 text-sage font-medium text-sm">
          Loading cafe menu items...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-cream-dark rounded-2xl">
          <p className="text-sm font-semibold text-coffee/70">No menu items match your search or filters.</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setFilterMode('all');
            }}
            className="mt-3 text-xs text-terracotta font-bold underline hover:text-terracotta/80"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-surface border rounded-2xl p-4 transition-all shadow-xs flex flex-col justify-between ${
                item.is_available
                  ? 'border-cream-dark/60 hover:border-terracotta/40'
                  : 'border-error/25 bg-error-light/10 opacity-75'
              }`}
            >
              <div>
                {/* Header row: Veg flag, Name, Bestseller star */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {/* Indian Veg / Non-Veg Icon */}
                    <div
                      className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                        item.veg_flag
                          ? 'border-success bg-white'
                          : 'border-terracotta bg-white'
                      }`}
                      title={item.veg_flag ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.veg_flag ? 'bg-success' : 'bg-terracotta'
                        }`}
                      ></span>
                    </div>

                    <h3 className="font-bold text-coffee text-sm leading-tight">{item.name}</h3>
                  </div>

                  {/* Bestseller toggle button */}
                  <button
                    onClick={() => handleToggleBestseller(item)}
                    disabled={!isAdmin}
                    className={`p-1 rounded-lg transition-colors ${
                      item.is_bestseller
                        ? 'text-amber bg-amber/10 hover:bg-amber/20'
                        : 'text-coffee/25 hover:text-coffee/60'
                    }`}
                    title={
                      isAdmin
                        ? item.is_bestseller
                          ? 'Click to remove Bestseller'
                          : 'Click to mark as Bestseller'
                        : 'Bestseller Flag'
                    }
                  >
                    <Star className={`w-4 h-4 ${item.is_bestseller ? 'fill-amber' : ''}`} />
                  </button>
                </div>

                {/* Category badge */}
                <div className="mb-2">
                  <span className="inline-block text-[10px] font-semibold text-sage bg-cream/60 px-2 py-0.5 rounded-full border border-cream-dark">
                    {item.category_name}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-coffee/70 line-clamp-2 mb-3">
                  {item.description || 'Authentic fresh recipe prepared daily at Chai Partner.'}
                </p>
              </div>

              {/* Footer row: Price & Availability Controls */}
              <div className="pt-3 border-t border-cream-dark/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-coffee text-base">₹{Number(item.price)}</span>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setPriceEditItem(item);
                        setNewPrice(item.price.toString());
                      }}
                      className="p-1 hover:bg-cream rounded-md text-sage hover:text-coffee transition-colors"
                      title="Edit Price (Audited)"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-terracotta" />
                    </button>
                  )}
                </div>

                {/* Availability Switch */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    disabled={!canToggleAvailability || actionLoading}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                      item.is_available
                        ? 'bg-success-light text-success border border-success/30 hover:bg-success/20'
                        : 'bg-error-light text-error border border-error/30 hover:bg-error/20'
                    }`}
                    title={canToggleAvailability ? 'Click to toggle availability' : 'Availability status'}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.is_available ? 'bg-success' : 'bg-error'
                      }`}
                    ></span>
                    <span>{item.is_available ? 'Available' : '86\'d / Out'}</span>
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setEditItem(item)}
                        className="p-1.5 hover:bg-cream rounded-lg text-sage hover:text-coffee transition-colors"
                        title="Edit Item Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteItem(item)}
                        className="p-1.5 hover:bg-error-light rounded-lg text-coffee/40 hover:text-error transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: Edit Price (with Audit Warning) */}
      {priceEditItem && (
        <div className="fixed inset-0 z-50 bg-coffee/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-cream-dark rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-coffee text-base">Edit Item Price</h3>
              <button onClick={() => setPriceEditItem(null)} className="p-1 hover:bg-cream rounded-lg">
                <X className="w-4 h-4 text-coffee/60" />
              </button>
            </div>

            <p className="text-xs text-coffee/80 mb-3">
              Editing price for <strong className="text-coffee">{priceEditItem.name}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-sage uppercase tracking-wider mb-1">
                Current Price: ₹{Number(priceEditItem.price)}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-cream/40 border border-cream-dark rounded-xl text-base font-bold text-coffee focus:outline-none focus:border-terracotta"
                  placeholder="Enter new price"
                  autoFocus
                />
              </div>
            </div>

            {/* Non-negotiable Audit Rule Notice */}
            <div className="mb-5 p-3 bg-cream/70 border border-terracotta/20 rounded-xl text-[11px] text-coffee/80 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-terracotta flex-shrink-0 mt-0.5" />
              <span>
                <strong>Audit Trail (Rule 9):</strong> This price modification is immutably logged with old price (₹{Number(priceEditItem.price)}) and new price. Live orders already placed keep their snapshotted prices.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPriceEditItem(null)}
                className="flex-1 py-2.5 bg-cream/60 border border-cream-dark text-coffee rounded-xl text-xs font-bold hover:bg-cream"
              >
                Cancel
              </button>
              <button
                onClick={handlePriceUpdate}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-terracotta text-cream rounded-xl text-xs font-bold hover:bg-terracotta/90 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Update Price'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New Menu Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-coffee/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-cream-dark rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-coffee text-base">Add New Menu Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-cream rounded-lg">
                <X className="w-4 h-4 text-coffee/60" />
              </button>
            </div>

            <div className="space-y-3.5 mb-5 text-xs">
              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Item Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kashmiri Kahwa Chai"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                />
              </div>

              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Price (₹) *</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                />
              </div>

              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief delicious description of the recipe ingredients..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2.5 bg-cream/40 border border-cream-dark rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.veg_flag ?? true}
                    onChange={(e) => setFormData({ ...formData, veg_flag: e.target.checked })}
                    className="accent-terracotta rounded"
                  />
                  <span className="font-semibold text-coffee">Pure Veg Item</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-cream/40 border border-cream-dark rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_bestseller ?? false}
                    onChange={(e) => setFormData({ ...formData, is_bestseller: e.target.checked })}
                    className="accent-terracotta rounded"
                  />
                  <span className="font-semibold text-coffee">Mark Bestseller</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 bg-cream/60 border border-cream-dark text-coffee rounded-xl text-xs font-bold hover:bg-cream"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-terracotta text-cream rounded-xl text-xs font-bold hover:bg-terracotta/90 disabled:opacity-50"
              >
                {actionLoading ? 'Adding...' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Item Details */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-coffee/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-cream-dark rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif font-bold text-coffee text-base">Edit Item Details</h3>
              <button onClick={() => setEditItem(null)} className="p-1 hover:bg-cream rounded-lg">
                <X className="w-4 h-4 text-coffee/60" />
              </button>
            </div>

            <div className="space-y-3.5 mb-5 text-xs">
              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Item Name</label>
                <input
                  type="text"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                />
              </div>

              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Category</label>
                <select
                  value={editItem.category_id}
                  onChange={(e) => setEditItem({ ...editItem, category_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Price (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={editItem.price}
                  onChange={(e) => setEditItem({ ...editItem, price: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                />
              </div>

              <div>
                <label className="block font-bold text-sage uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editItem.description || ''}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-cream/40 border border-cream-dark rounded-xl text-coffee focus:outline-none focus:border-terracotta"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2.5 bg-cream/40 border border-cream-dark rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editItem.veg_flag}
                    onChange={(e) => setEditItem({ ...editItem, veg_flag: e.target.checked })}
                    className="accent-terracotta rounded"
                  />
                  <span className="font-semibold text-coffee">Pure Veg Item</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-cream/40 border border-cream-dark rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editItem.is_bestseller}
                    onChange={(e) => setEditItem({ ...editItem, is_bestseller: e.target.checked })}
                    className="accent-terracotta rounded"
                  />
                  <span className="font-semibold text-coffee">Bestseller</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditItem(null)}
                className="flex-1 py-2.5 bg-cream/60 border border-cream-dark text-coffee rounded-xl text-xs font-bold hover:bg-cream"
              >
                Cancel
              </button>
              <button
                onClick={handleEditItem}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-terracotta text-cream rounded-xl text-xs font-bold hover:bg-terracotta/90 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 bg-coffee/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-cream-dark rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <h3 className="font-serif font-bold text-coffee text-base mb-2">Delete Menu Item?</h3>
            <p className="text-xs text-coffee/80 mb-5">
              Are you sure you want to permanently delete <strong className="text-error">{deleteItem.name}</strong> from the menu? Past orders will retain their historic data.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteItem(null)}
                className="flex-1 py-2.5 bg-cream/60 border border-cream-dark text-coffee rounded-xl text-xs font-bold hover:bg-cream"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-error text-cream rounded-xl text-xs font-bold hover:bg-error/90 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
