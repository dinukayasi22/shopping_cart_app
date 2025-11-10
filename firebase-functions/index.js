const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.database();
const firestore = admin.firestore();

/**
 * Firebase Cloud Function that listens to items collection in Realtime Database
 * When UHF RFID reader sends an RFID tag to the items collection, this function:
 * 1. Gets the RFID tag from the items collection
 * 2. Looks up item details from Firestore 'items' collection
 * 3. Adds the item to the active cart
 */
exports.processScannedItem = functions.database
  .ref('/items/{itemKey}')
  .onCreate(async (snapshot, context) => {
    const scannedItem = snapshot.val();
    const itemKey = context.params.itemKey;
    
    console.log('New RFID scanned in Realtime Database:', itemKey, scannedItem);
    
    try {
      // Extract RFID tag from the scanned item
      // Could be in item_id, rfidTag, rfid_id, or the itemKey itself
      const rfidTag = scannedItem.item_id || scannedItem.rfidTag || scannedItem.rfid_id || itemKey;
      
      if (!rfidTag) {
        console.error('No RFID tag found in scanned item:', scannedItem);
        return null;
      }
      
      console.log('Processing RFID tag:', rfidTag);
      
      // Get active cart ID
      const activeCartSnapshot = await db.ref('active_cart/cartId').once('value');
      const activeCartId = activeCartSnapshot.val();
      
      if (!activeCartId) {
        console.log('No active cart found. Item scanned but no active shopping session.');
        return null;
      }
      
      console.log('Active cart ID:', activeCartId);
      
      // Get cart to check status
      const cartSnapshot = await db.ref(`carts/${activeCartId}`).once('value');
      const cart = cartSnapshot.val();
      
      if (!cart) {
        console.error('Cart not found:', activeCartId);
        return null;
      }
      
      // Check if cart is active
      if (cart.status !== 'active') {
        console.log(`Cart ${activeCartId} is not active. Status: ${cart.status}`);
        return null;
      }
      
      // Look up item details from Firestore 'items' collection
      // Find item where rfidTags array contains the RFID tag
      const itemsSnapshot = await firestore.collection('items')
        .where('rfidTags', 'array-contains', rfidTag)
        .limit(1)
        .get();
      
      let firestoreItem = null;
      if (!itemsSnapshot.empty) {
        firestoreItem = itemsSnapshot.docs[0].data();
        console.log('Item found in Firestore:', firestoreItem);
      } else {
        console.log(`Item not found in Firestore for RFID: ${rfidTag}`);
      }
      
      // Use Firestore item data if found, otherwise create default item
      const itemData = firestoreItem ? {
        id: firestoreItem.id || rfidTag,
        name: firestoreItem.name || `Item ${rfidTag}`,
        price: firestoreItem.price || 0,
        rfidTag: rfidTag,
        imageUrl: firestoreItem.imageUrl || '',
        stock: firestoreItem.stock || 0,
      } : {
        id: rfidTag,
        name: `Item ${rfidTag}`,
        price: 0,
        rfidTag: rfidTag,
      };
      
      // Add item to cart
      await addItemToCart(activeCartId, itemData, cart);
      
      console.log(`Item "${itemData.name}" added to cart ${activeCartId}`);
      
      return null;
    } catch (error) {
      console.error('Error processing scanned item:', error);
      return null;
    }
  });

/**
 * Helper function to add item to cart
 */
async function addItemToCart(cartId, item, currentCart) {
  // Convert cart.items to array if it's an object (Firebase stores arrays as objects)
  let cartItems = [];
  if (Array.isArray(currentCart.items)) {
    cartItems = currentCart.items;
  } else if (currentCart.items && typeof currentCart.items === 'object') {
    cartItems = Object.values(currentCart.items);
  }
  
  const itemId = item.id || item.rfidTag;
  const existingItemIndex = cartItems.findIndex(cartItem => 
    cartItem.id === itemId || cartItem.id === item.rfidTag || cartItem.rfidTag === item.rfidTag
  );
  
  let updatedItems;
  if (existingItemIndex >= 0) {
    // Update existing item quantity
    updatedItems = [...cartItems];
    updatedItems[existingItemIndex].quantity = (updatedItems[existingItemIndex].quantity || 1) + 1;
    updatedItems[existingItemIndex].totalPrice = 
      updatedItems[existingItemIndex].quantity * (item.price || 0);
  } else {
    // Add new item
    const newCartItem = {
      id: itemId,
      name: item.name || `Item ${item.rfidTag}`,
      price: item.price || 0,
      quantity: 1,
      totalPrice: item.price || 0,
      rfidTag: item.rfidTag,
    };
    updatedItems = [...cartItems, newCartItem];
  }
  
  // Calculate total amount
  const totalAmount = updatedItems.reduce((sum, cartItem) => {
    return sum + (cartItem.totalPrice || 0);
  }, 0);
  
  // Update cart
  await db.ref(`carts/${cartId}`).update({
    items: updatedItems,
    totalAmount: totalAmount,
    updatedAt: new Date().toISOString(),
  });
  
  console.log(`Cart ${cartId} updated. Total items: ${updatedItems.length}, Total: ${totalAmount}`);
}

/**
 * Firebase Cloud Function that listens to payment status changes
 * When payment status is updated to 'completed', this function:
 * 1. Marks the associated cart as completed
 * 2. Clears the active cart
 */
exports.handlePaymentCompletion = functions.database
  .ref('/payments/{paymentId}')
  .onUpdate(async (change, context) => {
    const beforePayment = change.before.val();
    const afterPayment = change.after.val();
    const paymentId = context.params.paymentId;
    
    console.log('Payment status changed:', paymentId, 'from', beforePayment.status, 'to', afterPayment.status);
    
    // Only process if status changed to 'completed'
    if (beforePayment.status === 'completed' || afterPayment.status !== 'completed') {
      console.log('Payment status is not newly completed. Skipping.');
      return null;
    }
    
    try {
      const cartId = afterPayment.cartId;
      
      if (!cartId) {
        console.error('No cartId found in payment:', paymentId);
        return null;
      }
      
      console.log('Payment completed for cart:', cartId);
      
      // Mark cart as completed
      await db.ref(`carts/${cartId}`).update({
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      console.log(`Cart ${cartId} marked as completed`);
      
      // Clear active cart if this is the active cart
      const activeCartSnapshot = await db.ref('active_cart/cartId').once('value');
      const activeCartId = activeCartSnapshot.val();
      
      if (activeCartId === cartId) {
        await db.ref('active_cart').remove();
        console.log('Active cart cleared');
      }
      
      return null;
    } catch (error) {
      console.error('Error handling payment completion:', error);
      return null;
    }
  });
