import { realtimeDb } from '@/config/firebase';
import { equalTo, get, orderByChild, push, query, ref, remove, set, update } from 'firebase/database';

// Types for items data
export interface Item {
  id: string;
  name: string;
  price: number;
  rfidTag: string;
  description?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Types for cart data
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalAmount: number;
  status: 'active' | 'checkout' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

export interface PaymentData {
  transactionId: string;
  amount: number;
  cartId: string;
  items: CartItem[];
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
}

// API Service Class
class ApiService {
  constructor() {
    console.log('API Service initialized');
    this.testConnection();
  }

  // Test Firebase connection
  private async testConnection() {
    try {
      const testRef = ref(realtimeDb, 'test');
      await set(testRef, { timestamp: new Date().toISOString() });
      console.log('Firebase connection test successful');
      // Clean up test data
      await remove(testRef);
    } catch (error) {
      console.error('Firebase connection test failed:', error);
    }
  }

  // Helper function to add timeout to Firebase operations
  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number = 10000): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  }

  // Item Operations
  async getItemByRfidTag(rfidTag: string): Promise<Item | null> {
    return this.withTimeout(async () => {
      const itemsRef = ref(realtimeDb, 'items');
      const itemsQuery = query(itemsRef, orderByChild('rfidTag'), equalTo(rfidTag));
      const snapshot = await get(itemsQuery);
      
      if (snapshot.exists()) {
        const itemsData = snapshot.val();
        // Get the first item (should be unique by RFID tag)
        const itemId = Object.keys(itemsData)[0];
        const rawItem = itemsData[itemId];
        
        // Transform the data to match expected Item interface
        const item: Item = {
          id: rawItem.id || rawItem.Id || itemId,
          name: rawItem.name || rawItem.Name || 'Unknown Item',
          price: typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : 
                 typeof rawItem.Price === 'string' ? parseFloat(rawItem.Price) :
                 rawItem.price || rawItem.Price || 0,
          rfidTag: rawItem.rfidTag || rawItem.RfidTag || '',
          description: rawItem.description || rawItem.Description || '',
          category: rawItem.category || rawItem.Category || '',
          createdAt: rawItem.createdAt || rawItem.CreatedAt || new Date().toISOString(),
          updatedAt: rawItem.updatedAt || rawItem.UpdatedAt || new Date().toISOString(),
        };
        
        return item;
      }
      return null;
    });
  }

  async getAllItems(): Promise<Item[]> {
    return this.withTimeout(async () => {
      const itemsRef = ref(realtimeDb, 'items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const itemsData = snapshot.val();
        const items: Item[] = [];
        
        Object.entries(itemsData).forEach(([itemId, rawItem]: [string, any]) => {
          // Transform the data to match expected Item interface
          const item: Item = {
            id: rawItem.id || rawItem.Id || itemId,
            name: rawItem.name || rawItem.Name || 'Unknown Item',
            price: typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : 
                   typeof rawItem.Price === 'string' ? parseFloat(rawItem.Price) :
                   rawItem.price || rawItem.Price || 0,
            rfidTag: rawItem.rfidTag || rawItem.RfidTag || '',
            description: rawItem.description || rawItem.Description || '',
            category: rawItem.category || rawItem.Category || '',
            createdAt: rawItem.createdAt || rawItem.CreatedAt || new Date().toISOString(),
            updatedAt: rawItem.updatedAt || rawItem.UpdatedAt || new Date().toISOString(),
          };
          
          items.push(item);
        });
        
        return items;
      }
      return [];
    });
  }

  async getItemById(itemId: string): Promise<Item | null> {
    return this.withTimeout(async () => {
      const itemRef = ref(realtimeDb, `items/${itemId}`);
      const snapshot = await get(itemRef);
      
      if (snapshot.exists()) {
        const rawItem = snapshot.val();
        
        // Transform the data to match expected Item interface
        const item: Item = {
          id: rawItem.id || rawItem.Id || itemId,
          name: rawItem.name || rawItem.Name || 'Unknown Item',
          price: typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : 
                 typeof rawItem.Price === 'string' ? parseFloat(rawItem.Price) :
                 rawItem.price || rawItem.Price || 0,
          rfidTag: rawItem.rfidTag || rawItem.RfidTag || '',
          description: rawItem.description || rawItem.Description || '',
          category: rawItem.category || rawItem.Category || '',
          createdAt: rawItem.createdAt || rawItem.CreatedAt || new Date().toISOString(),
          updatedAt: rawItem.updatedAt || rawItem.UpdatedAt || new Date().toISOString(),
        };
        
        return item;
      }
      return null;
    });
  }

  // Cart Operations by Item
  async getCartsByItemId(itemId: string): Promise<Cart[]> {
    return this.withTimeout(async () => {
      const cartsRef = ref(realtimeDb, 'carts');
      const snapshot = await get(cartsRef);
      
      if (snapshot.exists()) {
        const cartsData = snapshot.val();
        const carts: Cart[] = [];
        
        // Filter carts that contain the specified item
        Object.values(cartsData).forEach((cart: any) => {
          if (cart.items && cart.items.some((item: CartItem) => item.id === itemId)) {
            carts.push(cart as Cart);
          }
        });
        
        return carts;
      }
      return [];
    });
  }

  async getCartsByRfidTag(rfidTag: string): Promise<Cart[]> {
    return this.withTimeout(async () => {
      // First get the item by RFID tag
      const item = await this.getItemByRfidTag(rfidTag);
      if (!item) {
        console.log(`No item found with RFID tag: ${rfidTag}`);
        return [];
      }
      
      // Then get carts containing this item
      return await this.getCartsByItemId(item.id);
    });
  }

  // Add item to cart
  async addItemToCart(cartId: string, item: Item, quantity: number = 1): Promise<void> {
    return this.withTimeout(async () => {
      const cartRef = ref(realtimeDb, `carts/${cartId}`);
      const snapshot = await get(cartRef);
      
      if (snapshot.exists()) {
        const cart = snapshot.val() as Cart;
        const existingItemIndex = cart.items.findIndex(cartItem => cartItem.id === item.id);
        
        let updatedItems: CartItem[];
        if (existingItemIndex >= 0) {
          // Update existing item quantity
          updatedItems = [...cart.items];
          updatedItems[existingItemIndex].quantity += quantity;
          updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].quantity * item.price;
        } else {
          // Add new item
          const newCartItem: CartItem = {
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: quantity,
            totalPrice: item.price * quantity,
          };
          updatedItems = [...cart.items, newCartItem];
        }
        
        const totalAmount = updatedItems.reduce((sum, cartItem) => sum + cartItem.totalPrice, 0);
        
        await update(cartRef, {
          items: updatedItems,
          totalAmount,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  // Simulate RFID detection and add item to cart
  async simulateRfidDetection(cartId: string, rfidTag: string, quantity: number = 1): Promise<{ success: boolean; message: string; item?: Item }> {
    try {
      // Get item by RFID tag
      const item = await this.getItemByRfidTag(rfidTag);
      
      if (!item) {
        return {
          success: false,
          message: `No item found with RFID tag: ${rfidTag}`
        };
      }
      
      // Add item to cart
      await this.addItemToCart(cartId, item, quantity);
      
      return {
        success: true,
        message: `Item "${item.name}" added to cart successfully`,
        item
      };
    } catch (error) {
      console.error('RFID detection simulation error:', error);
      return {
        success: false,
        message: `Error processing RFID tag: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Get all items with RFID tags (for debugging)
  async getItemsWithRfidTags(): Promise<{ rfidTag: string; item: Item }[]> {
    return this.withTimeout(async () => {
      const itemsRef = ref(realtimeDb, 'items');
      const snapshot = await get(itemsRef);
      
      if (snapshot.exists()) {
        const itemsData = snapshot.val();
        const itemsWithRfid: { rfidTag: string; item: Item }[] = [];
        
        Object.entries(itemsData).forEach(([itemId, rawItem]: [string, any]) => {
          // Check if item has RFID tag (handle both cases)
          const rfidTag = rawItem.rfidTag || rawItem.RfidTag;
          if (rfidTag) {
            // Transform the data to match expected Item interface
            const item: Item = {
              id: rawItem.id || rawItem.Id || itemId,
              name: rawItem.name || rawItem.Name || 'Unknown Item',
              price: typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : 
                     typeof rawItem.Price === 'string' ? parseFloat(rawItem.Price) :
                     rawItem.price || rawItem.Price || 0,
              rfidTag: rfidTag,
              description: rawItem.description || rawItem.Description || '',
              category: rawItem.category || rawItem.Category || '',
              createdAt: rawItem.createdAt || rawItem.CreatedAt || new Date().toISOString(),
              updatedAt: rawItem.updatedAt || rawItem.UpdatedAt || new Date().toISOString(),
            };
            
            itemsWithRfid.push({
              rfidTag: rfidTag,
              item: item
            });
          }
        });
        
        return itemsWithRfid;
      }
      return [];
    });
  }

  // Cart Operations
  async createCart(cartData: Omit<Cart, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Cart> {
    return this.withTimeout(async () => {
      const cartRef = ref(realtimeDb, 'carts');
      const newCartRef = push(cartRef);
      
      const cart: Cart = {
        id: newCartRef.key!,
        ...cartData,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await set(newCartRef, cart);
      
      // Set this cart as the active cart (for Arduino RFID reader)
      await this.setActiveCart(cart.id);
      
      return cart;
    });
  }

  // Set active cart (used by app and Arduino)
  async setActiveCart(cartId: string): Promise<void> {
    return this.withTimeout(async () => {
      const activeCartRef = ref(realtimeDb, 'active_cart');
      await set(activeCartRef, {
        cartId: cartId,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  // Get active cart ID (used by Arduino)
  async getActiveCartId(): Promise<string | null> {
    return this.withTimeout(async () => {
      const activeCartRef = ref(realtimeDb, 'active_cart');
      const snapshot = await get(activeCartRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        return data.cartId || null;
      }
      return null;
    });
  }

  async getCart(cartId: string): Promise<Cart | null> {
    return this.withTimeout(async () => {
      const cartRef = ref(realtimeDb, `carts/${cartId}`);
      const snapshot = await get(cartRef);
      
      if (snapshot.exists()) {
        return snapshot.val() as Cart;
      }
      return null;
    });
  }

  async updateCart(cartId: string, cartData: Partial<Cart>): Promise<void> {
    return this.withTimeout(async () => {
      const cartRef = ref(realtimeDb, `carts/${cartId}`);
      await update(cartRef, {
        ...cartData,
        updatedAt: new Date().toISOString(),
      });
    });
  }

  async deleteCart(cartId: string): Promise<void> {
    return this.withTimeout(async () => {
      const cartRef = ref(realtimeDb, `carts/${cartId}`);
      await remove(cartRef);
    });
  }

  // Payment Operations
  async createPayment(paymentData: Omit<PaymentData, 'transactionId'>): Promise<PaymentData> {
    const paymentRef = ref(realtimeDb, 'payments');
    const newPaymentRef = push(paymentRef);
    
    const payment: PaymentData = {
      transactionId: newPaymentRef.key!,
      ...paymentData,
    };

    await set(newPaymentRef, payment);
    return payment;
  }

  async getPayment(transactionId: string): Promise<PaymentData | null> {
    const paymentRef = ref(realtimeDb, `payments/${transactionId}`);
    const snapshot = await get(paymentRef);
    
    if (snapshot.exists()) {
      return snapshot.val() as PaymentData;
    }
    return null;
  }

  async updatePaymentStatus(transactionId: string, status: PaymentData['status']): Promise<void> {
    const paymentRef = ref(realtimeDb, `payments/${transactionId}`);
    await update(paymentRef, { status });
  }

  // Utility functions
  async getAllCarts(): Promise<Cart[]> {
    const cartsRef = ref(realtimeDb, 'carts');
    const snapshot = await get(cartsRef);
    
    if (snapshot.exists()) {
      const cartsData = snapshot.val();
      return Object.values(cartsData) as Cart[];
    }
    return [];
  }

  async getAllPayments(): Promise<PaymentData[]> {
    const paymentsRef = ref(realtimeDb, 'payments');
    const snapshot = await get(paymentsRef);
    
    if (snapshot.exists()) {
      const paymentsData = snapshot.val();
      return Object.values(paymentsData) as PaymentData[];
    }
    return [];
  }

  // Create empty cart
  createEmptyCart(): Omit<Cart, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
    return {
      items: [],
      totalAmount: 0,
    };
  }

  // Add item to cart by RFID tag (for Arduino RFID reader)
  // This method reads the active cart and adds the item
  async addItemToActiveCartByRfid(rfidTag: string, quantity: number = 1): Promise<{ success: boolean; message: string; cartId?: string }> {
    return this.withTimeout(async () => {
      try {
        // Get the active cart ID
        const activeCartId = await this.getActiveCartId();
        
        if (!activeCartId) {
          return {
            success: false,
            message: 'No active cart found. Please start a shopping session first.',
          };
        }

        // Get the item by RFID tag
        const item = await this.getItemByRfidTag(rfidTag);
        
        if (!item) {
          return {
            success: false,
            message: `Item with RFID tag ${rfidTag} not found in database.`,
            cartId: activeCartId,
          };
        }

        // Check if cart is still active
        const cart = await this.getCart(activeCartId);
        if (!cart || cart.status !== 'active') {
          return {
            success: false,
            message: `Cart ${activeCartId} is not active (status: ${cart?.status || 'not found'})`,
            cartId: activeCartId,
          };
        }

        // Add item to cart
        await this.addItemToCart(activeCartId, item, quantity);
        
        return {
          success: true,
          message: `Item "${item.name}" added to cart ${activeCartId}`,
          cartId: activeCartId,
        };
      } catch (error) {
        console.error('Error adding item to active cart by RFID:', error);
        return {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    });
  }

  // Update cart status
  async updateCartStatus(cartId: string, status: Cart['status']): Promise<void> {
    return this.withTimeout(async () => {
      const cartRef = ref(realtimeDb, `carts/${cartId}`);
      await update(cartRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
      
      // If cart is completed or abandoned, clear active cart
      if (status === 'completed' || status === 'abandoned') {
        const activeCartRef = ref(realtimeDb, 'active_cart');
        await remove(activeCartRef);
      }
    });
  }

  // Add test items to cart (for testing purposes)
  async addTestItemsToCart(cartId: string): Promise<void> {
    const testItems: CartItem[] = [
      {
        id: 'test_1',
        name: 'Test Item 1',
        price: 100.00,
        quantity: 1,
        totalPrice: 100.00,
      },
      {
        id: 'test_2',
        name: 'Test Item 2',
        price: 200.00,
        quantity: 2,
        totalPrice: 400.00,
      },
    ];

    const totalAmount = testItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    await update(ref(realtimeDb, `carts/${cartId}`), {
      items: testItems,
      totalAmount,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const apiService = new ApiService();
export default apiService;

