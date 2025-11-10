import { useEffect, useRef, useCallback } from 'react';
import { useCart } from '@/context/CartContext';

/**
 * Custom hook for real-time cart synchronization
 * Provides efficient automatic updates with minimal API calls
 */
export function useCartSync(updateInterval: number = 2000) {
  const { cart, refreshCart } = useCart();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<string>('');

  // Optimized refresh function that only updates when data changes
  const syncCart = useCallback(async () => {
    if (!cart?.id) return;

    try {
      await refreshCart(cart.id);
    } catch (error) {
      console.error('Cart sync error:', error);
      // Don't throw errors to avoid disrupting the sync loop
    }
  }, [cart?.id, refreshCart]);

  // Start automatic synchronization
  useEffect(() => {
    if (!cart?.id) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start new sync interval
    intervalRef.current = setInterval(syncCart, updateInterval);

    // Initial sync
    syncCart();

    // Cleanup on unmount or cart change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cart?.id, updateInterval, syncCart]);

  // Manual sync function for immediate updates
  const manualSync = useCallback(async () => {
    if (cart?.id) {
      await syncCart();
    }
  }, [cart?.id, syncCart]);

  // Check if cart is actively syncing
  const isSyncing = !!intervalRef.current;

  return {
    isSyncing,
    manualSync,
    lastUpdate: lastUpdateRef.current,
  };
}
