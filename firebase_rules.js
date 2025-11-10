/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const QRCode = require('qrcode');

admin.initializeApp();
const db = admin.firestore();

// Currency and location settings
const CURRENCY = 'LKR'; // Sri Lankan Rupees
const CURRENCY_SYMBOL = 'Rs.';

// CORS helper
function setCORSHeaders(res) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

// Generate unique IDs
function generateCartId() {
  return 'cart_' + Math.random().toString(36).substr(2, 9);
}

function generateTransactionId() {
  return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
}

/**
 * Get item details by RFID tag
 */
exports.getItemByRFID = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { rfidTag } = req.body;
    
    if (!rfidTag) {
      return res.status(400).json({ 
        success: false, 
        error: 'RFID tag is required' 
      });
    }

    const itemsRef = db.collection('items');
    const snapshot = await itemsRef.where('rfidTag', '==', rfidTag).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    const item = snapshot.docs[0];
    const itemData = { Item_ID: item.id, ...item.data() };
    
    res.json({ 
      success: true, 
      item: itemData 
    });
  } catch (error) {
    console.error('Error getting item by RFID:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Add item to cart
 */
exports.addItemToCart = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { cartId, rfidTag, quantity = 1, automated = false } = req.body;
    
    if (!cartId || !rfidTag) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart ID and RFID tag are required' 
      });
    }

    // Get item details
    const itemsRef = db.collection('items');
    const itemSnapshot = await itemsRef.where('rfidTag', '==', rfidTag).get();
    
    if (itemSnapshot.empty) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    const itemDoc = itemSnapshot.docs[0];
    const itemData = itemDoc.data();
    
    if (itemData.Quantity < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient stock' 
      });
    }

    const cartRef = db.collection('carts').doc(cartId);
    
    await db.runTransaction(async (transaction) => {
      const cartDoc = await transaction.get(cartRef);
      let cartData;
      
      if (!cartDoc.exists) {
        cartData = {
          Cart_ID: cartId,
          Status: 'Unlock', // Default status is Unlock
          items: [],
          total: 0,
          lastSync: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
      } else {
        cartData = cartDoc.data();
      }

      const existingItemIndex = cartData.items.findIndex(item => item.rfidTag === rfidTag);
      
      if (existingItemIndex >= 0) {
        cartData.items[existingItemIndex].Quantity += quantity;
      } else {
        cartData.items.push({
          Item_ID: itemDoc.id,
          Item_Name: itemData.Item_Name,
          Price: itemData.Price,
          Quantity: quantity,
          rfidTag: rfidTag,
          automated: automated,
          addedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      cartData.total = cartData.items.reduce((sum, item) => sum + (item.Price * item.Quantity), 0);
      cartData.lastSync = admin.firestore.FieldValue.serverTimestamp();
      
      transaction.set(cartRef, cartData);
    });

    res.json({ 
      success: true, 
      message: 'Item added to cart successfully' 
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Remove item from cart
 */
exports.removeItemFromCart = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { cartId, rfidTag, quantity = 1 } = req.body;
    
    if (!cartId || !rfidTag) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart ID and RFID tag are required' 
      });
    }

    const cartRef = db.collection('carts').doc(cartId);
    
    await db.runTransaction(async (transaction) => {
      const cartDoc = await transaction.get(cartRef);
      
      if (!cartDoc.exists) {
        throw new Error('Cart not found');
      }

      const cartData = cartDoc.data();
      const itemIndex = cartData.items.findIndex(item => item.rfidTag === rfidTag);
      
      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      if (cartData.items[itemIndex].Quantity <= quantity) {
        cartData.items.splice(itemIndex, 1);
      } else {
        cartData.items[itemIndex].Quantity -= quantity;
      }

      cartData.total = cartData.items.reduce((sum, item) => sum + (item.Price * item.Quantity), 0);
      cartData.lastSync = admin.firestore.FieldValue.serverTimestamp();
      
      transaction.set(cartRef, cartData);
    });

    res.json({ 
      success: true, 
      message: 'Item removed from cart successfully' 
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * Get cart contents with sync status
 */
exports.getCartContents = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { cartId } = req.body;
    
    if (!cartId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart ID is required' 
      });
    }

    const cartRef = db.collection('carts').doc(cartId);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cart not found' 
      });
    }

    const cartData = cartDoc.data();
    
    // Calculate sync status
    const now = Date.now();
    const lastSyncTime = cartData.lastSync ? cartData.lastSync.toMillis() : 0;
    const syncAge = now - lastSyncTime;
    const isSynced = syncAge < 30000; // 30 seconds threshold

    res.json({ 
      success: true, 
      cart: {
        ...cartData,
        syncStatus: {
          isSynced: isSynced,
          lastSync: cartData.lastSync,
          syncAge: syncAge
        }
      }
    });
  } catch (error) {
    console.error('Error getting cart contents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Process checkout and create QR code
 */
exports.processCheckout = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { cartId, paymentMethod = 'qr_code', mobileNumber, wantsReceipt = false } = req.body;
    
    if (!cartId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart ID is required' 
      });
    }

    const cartRef = db.collection('carts').doc(cartId);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cart not found' 
      });
    }

    const cartData = cartDoc.data();
    
    if (cartData.items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart is empty' 
      });
    }

    // Create Transaction_Report (can be anonymous)
    const transactionId = generateTransactionId();
    const transactionReportData = {
      Transaction_ID: transactionId,
      Amount: cartData.total,
      Transaction_time: admin.firestore.FieldValue.serverTimestamp(),
      Cart_ID: cartId,
      items: cartData.items,
      paymentMethod: paymentMethod,
      status: 'pending',
      isAnonymous: !mobileNumber, // Track if it's anonymous shopping
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // If mobile number provided and wants receipt, try to associate with user
    if (mobileNumber && wantsReceipt) {
      const usersRef = db.collection('users');
      const userQuery = await usersRef.where('Phone_No', '==', mobileNumber).get();
      
      if (!userQuery.empty) {
        const userData = userQuery.docs[0].data();
        transactionReportData.User_ID = userData.User_ID;
        transactionReportData.user = {
          Name: userData.Name,
          User_ID: userData.User_ID,
          Email: userData.Email
        };
        transactionReportData.mobileNumber = mobileNumber;
        transactionReportData.wantsReceipt = true;
      } else {
        // Mobile number provided but no account exists
        transactionReportData.mobileNumber = mobileNumber;
        transactionReportData.wantsReceipt = true;
        transactionReportData.needsAccountCreation = true;
      }
    }

    await db.collection('transaction_reports').doc(transactionId).set(transactionReportData);

    // Generate QR code
    const paymentData = {
      transactionId: transactionId,
      amount: cartData.total,
      timestamp: Date.now(),
      currency: CURRENCY_SYMBOL
    };
    
    const qrCodeData = JSON.stringify(paymentData);
    const qrCodeUrl = await QRCode.toDataURL(qrCodeData);

    // Update cart status - Lock cart during checkout
    await cartRef.update({
      Status: 'Lock', // Lock cart during checkout
      transactionId: transactionId,
      lastSync: admin.firestore.FieldValue.serverTimestamp()
    });

    const response = { 
      success: true, 
      transactionId: transactionId,
      qrCode: qrCodeUrl,
      total: cartData.total,
      formattedTotal: `${CURRENCY_SYMBOL} ${cartData.total.toFixed(2)}`,
      isAnonymous: !mobileNumber
    };

    // Add receipt info if applicable
    if (mobileNumber && wantsReceipt) {
      response.receiptInfo = {
        mobileNumber: mobileNumber,
        hasAccount: !transactionReportData.needsAccountCreation,
        needsAccountCreation: transactionReportData.needsAccountCreation || false
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error processing checkout:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Verify payment and unlock cart
 */
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { transactionId, paymentVerificationCode } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction ID is required' 
      });
    }

    const transactionRef = db.collection('transaction_reports').doc(transactionId);
    const transactionDoc = await transactionRef.get();
    
    if (!transactionDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction report not found' 
      });
    }

    const transactionData = transactionDoc.data();
    
    // Simple payment verification
    const isPaymentValid = paymentVerificationCode === 'PAID' || 
                          paymentVerificationCode === transactionId.substr(-6);

    if (!isPaymentValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment verification failed' 
      });
    }

    // Update transaction
    const updateData = {
      status: 'completed',
      paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      paymentVerificationCode: paymentVerificationCode
    };

    // Update customer purchase stats if user is associated
    if (transactionData.User_ID) {
      const customerRef = db.collection('customers').doc(transactionData.User_ID);
      await customerRef.update({
        totalPurchases: admin.firestore.FieldValue.increment(1),
        totalSpent: admin.firestore.FieldValue.increment(transactionData.Amount),
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await transactionRef.update(updateData);

    // Unlock cart
    const cartRef = db.collection('carts').doc(transactionData.Cart_ID);
    await cartRef.update({
      Status: 'Unlock', // Unlock cart after payment verification
      unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSync: admin.firestore.FieldValue.serverTimestamp()
    });

    const response = { 
      success: true, 
      message: 'Payment verified and cart unlocked',
      unlocked: true,
      transactionId: transactionId,
      total: transactionData.Amount,
      formattedTotal: `${CURRENCY_SYMBOL} ${transactionData.Amount.toFixed(2)}`
    };

    // Add receipt info if user wants receipt
    if (transactionData.wantsReceipt && transactionData.mobileNumber) {
      response.receiptInfo = {
        mobileNumber: transactionData.mobileNumber,
        hasAccount: !!transactionData.User_ID,
        needsAccountCreation: transactionData.needsAccountCreation || false
      };
      
      // If user has account, we can send receipt automatically
      if (transactionData.User_ID && transactionData.user && transactionData.user.Email) {
        response.receiptInfo.canSendReceipt = true;
        response.receiptInfo.email = transactionData.user.Email;
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Update item details (admin only)
 */
exports.updateItemDetails = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { itemId, updates, adminToken } = req.body;
    
    if (!itemId || !updates) {
      return res.status(400).json({ 
        success: false, 
        error: 'Item ID and updates are required' 
      });
    }

    // Simple admin verification
    if (adminToken !== 'admin123') {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    const itemRef = db.collection('items').doc(itemId);
    const itemDoc = await itemRef.get();
    
    if (!itemDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found' 
      });
    }

    const updateData = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await itemRef.update(updateData);

    res.json({ 
      success: true, 
      message: 'Item updated successfully' 
    });
  } catch (error) {
    console.error('Error updating item details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Get cart sync status
 */
exports.getCartSyncStatus = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { cartId } = req.body;
    
    if (!cartId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cart ID is required' 
      });
    }

    const cartRef = db.collection('carts').doc(cartId);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cart not found' 
      });
    }

    const cartData = cartDoc.data();
    const now = Date.now();
    const lastSyncTime = cartData.lastSync ? cartData.lastSync.toMillis() : 0;
    const syncAge = now - lastSyncTime;
    const isSynced = syncAge < 30000;

    res.json({ 
      success: true, 
      syncStatus: {
        isSynced: isSynced,
        lastSync: cartData.lastSync,
        syncAge: syncAge,
        status: cartData.status,
        itemCount: cartData.items ? cartData.items.length : 0
      }
    });
  } catch (error) {
    console.error('Error getting cart sync status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Get all products for admin panel
 */
exports.getAllProducts = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { limit = 50, offset = 0, category, status } = req.body;
    
    let query = db.collection('items');
    
    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);
    
    const snapshot = await query.get();
    const products = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data,
        formattedPrice: `${CURRENCY_SYMBOL} ${(data.Price || 0).toFixed(2)}`
      });
    });

    res.json({ 
      success: true, 
      products: products,
      total: snapshot.size
    });
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Get all carts for admin panel
 */
exports.getAllCarts = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { limit = 50, offset = 0, status } = req.body;
    
    let query = db.collection('carts');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('lastSync', 'desc').limit(limit).offset(offset);
    
    const snapshot = await query.get();
    const carts = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      carts.push({
        id: doc.id,
        ...data,
        formattedTotal: `${CURRENCY_SYMBOL} ${data.total ? data.total.toFixed(2) : '0.00'}`,
        itemCount: data.items ? data.items.length : 0
      });
    });

    res.json({ 
      success: true, 
      carts: carts,
      total: snapshot.size
    });
  } catch (error) {
    console.error('Error getting carts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Get all transactions for admin panel
 */
exports.getAllTransactions = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { limit = 50, offset = 0, status, startDate, endDate } = req.body;
    
    let query = db.collection('transaction_reports');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (startDate) {
      query = query.where('Transaction_time', '>=', new Date(startDate));
    }
    
    if (endDate) {
      query = query.where('Transaction_time', '<=', new Date(endDate));
    }
    
    query = query.orderBy('Transaction_time', 'desc').limit(limit).offset(offset);
    
    const snapshot = await query.get();
    const transactions = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      transactions.push({
        Transaction_ID: doc.id,
        ...data,
        formattedAmount: `${CURRENCY_SYMBOL} ${data.Amount ? data.Amount.toFixed(2) : '0.00'}`
      });
    });

    res.json({ 
      success: true, 
      transactions: transactions,
      total: snapshot.size
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Verify mobile number and get/create user account
 */
exports.verifyMobileNumber = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { mobileNumber } = req.body;
    
    if (!mobileNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mobile number is required' 
      });
    }

    // Check if user exists with this mobile number
    const usersRef = db.collection('users');
    const existingUser = await usersRef.where('Phone_No', '==', mobileNumber).get();
    
    if (!existingUser.empty) {
      // User exists - return user data
      const userData = existingUser.docs[0].data();
      
      // Update last seen
      await existingUser.docs[0].ref.update({
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return res.json({ 
        success: true, 
        userExists: true,
        user: userData,
        message: 'User account found'
      });
    } else {
      // User doesn't exist - they need to create account
      return res.json({ 
        success: true, 
        userExists: false,
        message: 'No account found. Please create an account to receive receipt.'
      });
    }
  } catch (error) {
    console.error('Error verifying mobile number:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Create new user account
 */
exports.createUserAccount = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { mobileNumber, fullName, email } = req.body;
    
    if (!mobileNumber || !fullName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mobile number and full name are required' 
      });
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingUser = await usersRef.where('Phone_No', '==', mobileNumber).get();
    
    if (!existingUser.empty) {
      return res.status(409).json({ 
        success: false, 
        error: 'Account already exists for this mobile number' 
      });
    }

    // Create new user
    const userId = 'user_' + mobileNumber.replace(/\D/g, '');
    const newUser = {
      User_ID: userId,
      Phone_No: mobileNumber,
      Name: fullName,
      Email: email || '',
      userType: 'Customer', // Default to Customer subtype
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp()
    };

    await usersRef.doc(userId).set(newUser);

    // Create corresponding customer record
    const newCustomer = {
      User_ID: userId,
      totalPurchases: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      preferredPaymentMethod: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('customers').doc(userId).set(newCustomer);

    res.json({ 
      success: true, 
      user: newUser,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error creating user account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    // Get product count
    const productsSnapshot = await db.collection('items').get();
    const totalProducts = productsSnapshot.size;

    // Get active carts (unlocked carts)
    const activeCartsSnapshot = await db.collection('carts')
      .where('Status', '==', 'Unlock').get();
    const activeCarts = activeCartsSnapshot.size;

    // Get completed transaction reports for total sales
    const completedTransactionsSnapshot = await db.collection('transaction_reports')
      .where('status', '==', 'completed').get();
    
    let totalSales = 0;
    let completedTransactions = 0;
    
    completedTransactionsSnapshot.forEach(doc => {
      const data = doc.data();
      totalSales += data.Amount || 0;
      completedTransactions++;
    });

    // Calculate success rate
    const allTransactionsSnapshot = await db.collection('transaction_reports').get();
    const totalTransactions = allTransactionsSnapshot.size;
    const successRate = totalTransactions > 0 ? 
      ((completedTransactions / totalTransactions) * 100).toFixed(1) : 0;

    res.json({ 
      success: true, 
      stats: {
        totalProducts: totalProducts,
        activeCarts: activeCarts,
        totalSales: totalSales,
        formattedTotalSales: `${CURRENCY_SYMBOL} ${totalSales.toFixed(2)}`,
        successRate: `${successRate}%`,
        completedTransactions: completedTransactions,
        totalTransactions: totalTransactions
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Send receipt via email/SMS
 */
exports.sendReceipt = functions.https.onRequest(async (req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  try {
    const { transactionId, email, mobileNumber, method = 'email' } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Transaction ID is required' 
      });
    }

    const transactionRef = db.collection('transaction_reports').doc(transactionId);
    const transactionDoc = await transactionRef.get();
    
    if (!transactionDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Transaction report not found' 
      });
    }

    const transactionData = transactionDoc.data();
    
    // Create receipt data
    const receipt = {
      Transaction_ID: transactionId,
      date: transactionData.Transaction_time,
      items: transactionData.items,
      Amount: transactionData.Amount,
      formattedAmount: `${CURRENCY_SYMBOL} ${transactionData.Amount.toFixed(2)}`,
      paymentMethod: transactionData.paymentMethod,
      status: transactionData.status
    };

    // In a real implementation, you would integrate with email/SMS services
    // For now, we'll just log and return success
    console.log(`Receipt sent via ${method}:`, receipt);

    // Update transaction with receipt info
    await transactionRef.update({
      receiptSent: true,
      receiptSentAt: admin.firestore.FieldValue.serverTimestamp(),
      receiptMethod: method,
      receiptDestination: method === 'email' ? email : mobileNumber
    });

    res.json({ 
      success: true, 
      message: `Receipt sent successfully via ${method}`,
      receipt: receipt
    });
  } catch (error) {
    console.error('Error sending receipt:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

setGlobalOptions({ maxInstances: 10 });