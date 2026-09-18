import { useSyncExternalStore } from 'react';
import type { Product } from '@workspace/api-client-react';

const KEY = 'bunsen_cart';

export interface CartLine {
  product_id: string;
  name: string;
  /** Display only. The server reprices every line from the database. */
  unit_price: number;
  quantity: number;
}

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Anything hand-edited or left over from an older shape is discarded
    // rather than allowed to crash the menu on load.
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.product_id === 'string' &&
        typeof line?.name === 'string' &&
        typeof line?.unit_price === 'number' &&
        typeof line?.quantity === 'number' &&
        line.quantity > 0,
    );
  } catch {
    return [];
  }
}

// Module-level so the menu and the checkout page always agree, kept in a
// stable reference so useSyncExternalStore does not loop.
let lines: CartLine[] = read();
const listeners = new Set<() => void>();

function commit(next: CartLine[]): void {
  lines = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* session-only cart if storage is unavailable */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== 'undefined') {
  // Keep two tabs of the same shop in step.
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    lines = read();
    listeners.forEach((listener) => listener());
  });
}

function snapshot(): CartLine[] {
  return lines;
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function addToCart(product: Product): void {
  const existing = lines.find((line) => line.product_id === product.id);
  commit(
    existing
      ? lines.map((line) =>
          line.product_id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        )
      : [
          ...lines,
          {
            product_id: product.id,
            name: product.name,
            unit_price: product.price,
            quantity: 1,
          },
        ],
  );
}

export function changeQuantity(productId: string, delta: number): void {
  commit(
    lines.flatMap((line) => {
      if (line.product_id !== productId) return [line];
      const quantity = line.quantity + delta;
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }),
  );
}

export function clearCart(): void {
  commit([]);
}

export function cartCount(items: CartLine[]): number {
  return items.reduce((total, line) => total + line.quantity, 0);
}

export function cartTotal(items: CartLine[]): number {
  return items.reduce((total, line) => total + line.unit_price * line.quantity, 0);
}
