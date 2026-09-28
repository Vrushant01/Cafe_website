'use client';

import { useState, useEffect } from 'react';
import { GST_RATE } from '@chai-partner/shared';

export interface CartItem {
  id: string; // menu_item_id
  name: string;
  price: number;
  qty: number;
  veg_flag: boolean;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cp_cart_items');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore parsing errors
    }
    setIsLoaded(true);
  }, []);

  const saveItems = (newItems: CartItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('cp_cart_items', JSON.stringify(newItems));
    } catch {
      // ignore storage errors
    }
  };

  const addItem = (item: { id: string; name: string; price: number; veg_flag: boolean }) => {
    const existingIndex = items.findIndex((i) => i.id === item.id);
    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].qty += 1;
      saveItems(updated);
    } else {
      saveItems([...items, { ...item, qty: 1 }]);
    }
  };

  const removeItem = (itemId: string) => {
    const existingIndex = items.findIndex((i) => i.id === itemId);
    if (existingIndex > -1) {
      const updated = [...items];
      if (updated[existingIndex].qty > 1) {
        updated[existingIndex].qty -= 1;
        saveItems(updated);
      } else {
        saveItems(items.filter((i) => i.id !== itemId));
      }
    }
  };

  const clearCart = () => {
    saveItems([]);
    try {
      localStorage.removeItem('cp_cart_items');
    } catch {}
  };

  const totalQuantity = items.reduce((acc, item) => acc + item.qty, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = Math.round(subtotal * GST_RATE * 100) / 100;
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;

  return {
    items,
    isLoaded,
    addItem,
    removeItem,
    clearCart,
    totalQuantity,
    subtotal,
    tax,
    grandTotal,
  };
}
