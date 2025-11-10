import apiService, { Cart, Item, PaymentData } from '@/services/api';
import React, { createContext, useContext, useState } from 'react';

// Cart Context Interface
interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  
  // Cart Operations
  loadCart: (cartId: string) => Promise<void>;
  createCart: () => Promise<void>;
  updateCart: (cartData: Partial<Cart>) => Promise<void>;
  refreshCart: (cartId: string) => Promise<void>;
  clearCart: () => void;
  
  // Item Operations
  getItemByRfidTag: (rfidTag: string) => Promise<Item | null>;
  addItemToCart: (item: Item, quantity?: number) => Promise<void>;
  
  // Cart Search Operations
  getCartsByRfidTag: (rfidTag: string) => Promise<Cart[]>;
  getCartsByItemId: (itemId: string) => Promise<Cart[]>;
  
  // RFID Simulation
  simulateRfidDetection: (rfidTag: string, quantity?: number) => Promise<{ success: boolean; message: string; item?: Item }>;
  getItemsWithRfidTags: () => Promise<{ rfidTag: string; item: Item }[]>;
  
  // Payment Operations
  createPayment: (amount: number) => Promise<PaymentData>;
  
  // Utility Functions
  getItemCount: () => number;
  getTotalAmount: () => number;
  formatPrice: (price: number) => string;
}

// Create Context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Cart Provider Component
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cart from Firebase
  const loadCart = async (cartId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const cartData = await apiService.getCart(cartId);
      if (cartData) {
        setCart(cartData);
      } else {
        // If cart doesn't exist, create a new one
        await createCart();
      }
    } catch (err) {
      console.error('Error loading cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  // Create new cart
  const createCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const emptyCart = apiService.createEmptyCart();
      const newCart = await apiService.createCart(emptyCart);
      
      setCart(newCart);
    } catch (err) {
      console.error('Error creating cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to create cart');
    } finally {
      setLoading(false);
    }
  };

  // Update cart
  const updateCart = async (cartData: Partial<Cart>) => {
    if (!cart) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await apiService.updateCart(cart.id, cartData);
      setCart(prev => prev ? { ...prev, ...cartData } : null);
    } catch (err) {
      console.error('Error updating cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to update cart');
    } finally {
      setLoading(false);
    }
  };

  // Refresh cart from Firebase
  const refreshCart = async (cartId: string) => {
    try {
      const cartData = await apiService.getCart(cartId);
      if (cartData) {
        // Only update if the data has actually changed
        if (!cart || cart.updatedAt !== cartData.updatedAt) {
          console.log('Cart data changed, updating...');
          setCart(cartData);
        }
      }
    } catch (err) {
      console.error('Error refreshing cart:', err);
      // Don't set error for refresh failures to avoid disrupting the UI
      // Only log the error for debugging
    }
  };

  // Optimized refresh cart with debouncing
  const refreshCartOptimized = async (cartId: string) => {
    try {
      const cartData = await apiService.getCart(cartId);
      if (cartData) {
        // Only update if the data has actually changed
        if (!cart || cart.updatedAt !== cartData.updatedAt) {
          console.log('Cart data changed, updating...');
          setCart(cartData);
        }
      }
    } catch (err) {
      console.error('Error refreshing cart:', err);
      // Don't set error for refresh failures to avoid disrupting the UI
    }
  };

  // Clear cart
  const clearCart = () => {
    setCart(null);
    setError(null);
  };

  // Get item by RFID tag
  const getItemByRfidTag = async (rfidTag: string): Promise<Item | null> => {
    try {
      setError(null);
      const item = await apiService.getItemByRfidTag(rfidTag);
      return item;
    } catch (err) {
      console.error('Error getting item by RFID tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to get item by RFID tag');
      return null;
    }
  };

  // Add item to cart
  const addItemToCart = async (item: Item, quantity: number = 1) => {
    if (!cart) {
      console.error('No cart available to add item to');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await apiService.addItemToCart(cart.id, item, quantity);
      
      // Refresh cart to get updated data
      await refreshCart(cart.id);
    } catch (err) {
      console.error('Error adding item to cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item to cart');
    } finally {
      setLoading(false);
    }
  };

  // Get carts by RFID tag
  const getCartsByRfidTag = async (rfidTag: string): Promise<Cart[]> => {
    try {
      setError(null);
      const carts = await apiService.getCartsByRfidTag(rfidTag);
      return carts;
    } catch (err) {
      console.error('Error getting carts by RFID tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to get carts by RFID tag');
      return [];
    }
  };

  // Get carts by item ID
  const getCartsByItemId = async (itemId: string): Promise<Cart[]> => {
    try {
      setError(null);
      const carts = await apiService.getCartsByItemId(itemId);
      return carts;
    } catch (err) {
      console.error('Error getting carts by item ID:', err);
      setError(err instanceof Error ? err.message : 'Failed to get carts by item ID');
      return [];
    }
  };

  // RFID Simulation
  const simulateRfidDetection = async (rfidTag: string, quantity?: number): Promise<{ success: boolean; message: string; item?: Item }> => {
    try {
      setError(null);
      const item = await getItemByRfidTag(rfidTag);
      if (item) {
        await addItemToCart(item, quantity);
        return { success: true, message: `Item with RFID tag ${rfidTag} added to cart.`, item };
      } else {
        return { success: false, message: `Item with RFID tag ${rfidTag} not found.` };
      }
    } catch (err) {
      console.error('Error simulating RFID detection:', err);
      setError(err instanceof Error ? err.message : 'Failed to simulate RFID detection');
      return { success: false, message: err instanceof Error ? err.message : 'Failed to simulate RFID detection' };
    }
  };

  const getItemsWithRfidTags = async (): Promise<{ rfidTag: string; item: Item }[]> => {
    try {
      setError(null);
      const items = await apiService.getItemsWithRfidTags();
      return items;
    } catch (err) {
      console.error('Error getting items with RFID tags:', err);
      setError(err instanceof Error ? err.message : 'Failed to get items with RFID tags');
      return [];
    }
  };

  // Create payment
  const createPayment = async (amount: number): Promise<PaymentData> => {
    if (!cart) {
      throw new Error('No cart available');
    }

    try {
      // Update cart status to 'checkout'
      await apiService.updateCartStatus(cart.id, 'checkout');
      
      const paymentData = await apiService.createPayment({
        amount,
        cartId: cart.id,
        items: cart.items,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });

      return paymentData;
    } catch (err) {
      console.error('Error creating payment:', err);
      throw err;
    }
  };

  // Utility functions
  const getItemCount = () => {
    if (!cart) return 0;
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  };

  const getTotalAmount = () => {
    return cart?.totalAmount || 0;
  };

  const formatPrice = (price: number) => {
    return `Rs. ${price.toFixed(2)}`;
  };

  // Cart is now created manually when user clicks "Start Shopping" button
  // Removed auto-create on mount to allow user-initiated cart creation

  // Context value
  const contextValue: CartContextType = {
    cart,
    loading,
    error,
    loadCart,
    createCart,
    updateCart,
    refreshCart,
    clearCart,
    getItemByRfidTag,
    addItemToCart,
    getCartsByRfidTag,
    getCartsByItemId,
    simulateRfidDetection,
    getItemsWithRfidTags,
    createPayment,
    getItemCount,
    getTotalAmount,
    formatPrice,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

// Hook to use cart context
export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

