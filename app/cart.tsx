import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView, Alert } from 'react-native';
import { useCart } from '@/context/CartContext';
import { useCartSync } from '@/hooks/useCartSync';
import { CartItem, Item } from '@/services/api';
import apiService from '@/services/api';

export default function CartScreen() {
  const { 
    cart, 
    loading, 
    error, 
    getItemCount, 
    getTotalAmount, 
    formatPrice,
    createPayment,
    createCart,
    getItemByRfidTag,
    getCartsByRfidTag,
    addItemToCart,
    simulateRfidDetection,
    getItemsWithRfidTags
  } = useCart();

  // Use the custom cart sync hook for real-time updates
  const { isSyncing, manualSync } = useCartSync(2000); // Update every 2 seconds

  const [rfidTestResult, setRfidTestResult] = useState<string>('');
  const [availableRfidItems, setAvailableRfidItems] = useState<{ rfidTag: string; item: Item }[]>([]);
  const [showRfidItems, setShowRfidItems] = useState(false);

  // Load available RFID items
  const loadRfidItems = async () => {
    try {
      const items = await getItemsWithRfidTags();
      setAvailableRfidItems(items);
    } catch (error) {
      console.error('Error loading RFID items:', error);
    }
  };

  // Simulate RFID detection for a specific tag
  const handleRfidSimulation = async (rfidTag: string) => {
    try {
      const result = await simulateRfidDetection(rfidTag, 1);
      if (result.success) {
        Alert.alert('RFID Detection', result.message);
        // Trigger immediate sync to show the new item
        await manualSync();
      } else {
        Alert.alert('RFID Detection Failed', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to simulate RFID detection');
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }

    try {
      // Create payment in Firebase
      const payment = await createPayment(cart.totalAmount);
      console.log('Payment created:', payment);
      
      // Navigate to payment screen
      router.push('/payment');
    } catch (error) {
      Alert.alert('Error', 'Failed to process checkout. Please try again.');
    }
  };

  // Test RFID functionality with the specific RFID tag
  const testRfidFunctionality = async () => {
    const rfidTag = "E28069150000401B2847F571";
    setRfidTestResult('Testing RFID functionality...');
    
    try {
      // Step 1: Get item by RFID tag
      console.log(`Testing RFID tag: ${rfidTag}`);
      const item = await getItemByRfidTag(rfidTag);
      
      if (item) {
        console.log('Item found:', item);
        setRfidTestResult(`✅ Item found: ${item.name} - Rs. ${item.price}`);
        
        // Step 2: Get carts containing this item
        const relatedCarts = await getCartsByRfidTag(rfidTag);
        console.log('Related carts:', relatedCarts);
        
        if (relatedCarts.length > 0) {
          setRfidTestResult(prev => prev + `\n📦 Found ${relatedCarts.length} cart(s) containing this item`);
          
          // Step 3: Add item to current cart if not already present
          if (cart && !cart.items.some(cartItem => cartItem.id === item.id)) {
            await addItemToCart(item, 1);
            setRfidTestResult(prev => prev + '\n🛒 Item added to current cart!');
            Alert.alert('Success', `Item "${item.name}" added to cart!`);
            // Trigger immediate sync to show the new item
            await manualSync();
          } else if (cart && cart.items.some(cartItem => cartItem.id === item.id)) {
            setRfidTestResult(prev => prev + '\nℹ️ Item already in current cart');
          }
        } else {
          setRfidTestResult(prev => prev + '\n📦 No carts found containing this item');
        }
      } else {
        setRfidTestResult(`❌ No item found with RFID tag: ${rfidTag}`);
        Alert.alert('RFID Test', `No item found with RFID tag: ${rfidTag}`);
      }
    } catch (error) {
      console.error('RFID test error:', error);
      setRfidTestResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert('RFID Test Error', 'Failed to test RFID functionality');
    }
  };

  // Load RFID items when component mounts
  useEffect(() => {
    loadRfidItems();
  }, []);

  // Log cart data when it changes
  useEffect(() => {
    if (cart) {
      console.log('Cart data updated:', {
        id: cart.id,
        itemCount: cart.items.length,
        totalAmount: cart.totalAmount,
        lastUpdated: cart.updatedAt
      });
    }
  }, [cart]);

  if (loading && !cart) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading cart from Firebase...</Text>
      </View>
    );
  }

  if (error && !cart) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={createCart}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!cart) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No cart available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={createCart}>
          <Text style={styles.retryButtonText}>Create Cart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityLabel="Shopping cart screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text 
          style={styles.headerTitle}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Smart Shopping Cart title"
        >
          Smart Shopping Cart
        </Text>
        <View style={styles.headerInfo}>
          <Text 
            style={styles.time}
            accessible={true}
            accessibilityLabel="Current time"
          >
            {new Date().toLocaleTimeString()}
          </Text>
          <Text 
            style={styles.date}
            accessible={true}
            accessibilityLabel="Current date"
          >
            {new Date().toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Shopping Cart List */}
        <View style={styles.cartSection}>
          <View style={styles.sectionHeader}>
            <Text 
              style={styles.sectionTitle}
              accessible={true}
              accessibilityRole="header"
              accessibilityLabel="Shopping cart section"
            >
              Shopping Cart
            </Text>
            
            {/* Real-time update indicator */}
            <View style={styles.realtimeIndicator}>
              <View style={[styles.indicatorDot, { backgroundColor: isSyncing ? '#27AE60' : '#E74C3C' }]} />
              <Text style={styles.indicatorText}>
                {isSyncing ? 'Live Updates' : 'Updates Paused'}
              </Text>
            </View>
            
            {/* Test button for development */}
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={async () => {
                if (cart) {
                  try {
                    await apiService.addTestItemsToCart(cart.id);
                    // Trigger immediate sync to show new items
                    await manualSync();
                    Alert.alert('Success', 'Test items added to cart');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to add test items');
                  }
                }
              }}
            >
              <Text style={styles.testButtonText}>🧪 Add Test Items</Text>
            </TouchableOpacity>

            {/* RFID Test Button */}
            <TouchableOpacity 
              style={styles.rfidTestButton} 
              onPress={testRfidFunctionality}
            >
              <Text style={styles.rfidTestButtonText}>🏷️ Test RFID</Text>
            </TouchableOpacity>
            
            {/* Show Available RFID Items Button */}
            <TouchableOpacity 
              style={styles.rfidItemsButton} 
              onPress={() => {
                setShowRfidItems(!showRfidItems);
                if (!showRfidItems) {
                  loadRfidItems();
                }
              }}
            >
              <Text style={styles.rfidItemsButtonText}>
                {showRfidItems ? '🔽 Hide RFID Items' : '🔼 Show RFID Items'}
              </Text>
            </TouchableOpacity>
            
            {rfidTestResult ? (
              <Text style={styles.rfidTestResultText}>{rfidTestResult}</Text>
            ) : null}
            
            {/* Available RFID Items Display */}
            {showRfidItems && (
              <View style={styles.rfidItemsContainer}>
                <Text style={styles.rfidItemsTitle}>Available RFID Items:</Text>
                {availableRfidItems.length > 0 ? (
                  availableRfidItems.map(({ rfidTag, item }) => (
                    <View key={rfidTag} style={styles.rfidItemRow}>
                      <View style={styles.rfidItemInfo}>
                        <Text style={styles.rfidItemName}>{item.name}</Text>
                        <Text style={styles.rfidItemPrice}>{formatPrice(item.price)}</Text>
                        <Text style={styles.rfidItemTag}>Tag: {rfidTag}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.simulateRfidButton}
                        onPress={() => handleRfidSimulation(rfidTag)}
                      >
                        <Text style={styles.simulateRfidButtonText}>Simulate</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noRfidItemsText}>No RFID items found in database</Text>
                )}
              </View>
            )}
          </View>
          
          {cart.items.length > 0 ? (
            <ScrollView 
              style={styles.cartList} 
              showsVerticalScrollIndicator={false}
              accessible={true}
              accessibilityLabel="Cart items list"
            >
              {cart.items.map((item) => (
                <View 
                  key={item.id} 
                  style={styles.cartItem}
                  accessible={true}
                  accessibilityLabel={`${item.name}, quantity ${item.quantity}, total ${formatPrice(item.totalPrice)}`}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                    <Text style={styles.itemTotal}>{formatPrice(item.totalPrice)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>Items will be automatically added when detected by RFID sensors</Text>
              <Text style={styles.emptyCartSubtext}>Or manually add items through the admin panel</Text>
              <Text style={styles.realtimeNote}>
                🔄 Cart updates automatically every 1 seconds
                {!isSyncing && ' (Updates paused)'}
              </Text>
            </View>
          )}
        </View>

        {/* Cart Summary */}
        <View 
          style={styles.summarySection}
          accessible={true}
          accessibilityLabel="Cart summary section"
        >
          <Text 
            style={styles.sectionTitle}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="Cart summary title"
          >
            Cart Summary
          </Text>
          
          {/* Cart ID Display */}
          <View style={styles.cartIdContainer}>
            <Text style={styles.cartIdLabel}>Cart ID:</Text>
            <Text style={styles.cartIdValue}>{cart.id}</Text>
          </View>
          
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text 
                style={styles.summaryLabel}
                accessible={true}
                accessibilityLabel="Total items label"
              >
                Total Items:
              </Text>
              <Text 
                style={styles.summaryValue}
                accessible={true}
                accessibilityLabel={`Total items: ${getItemCount()}`}
              >
                {getItemCount()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text 
                style={styles.summaryLabel}
                accessible={true}
                accessibilityLabel="Total amount label"
              >
                Total Amount:
              </Text>
              <Text 
                style={styles.totalAmount}
                accessible={true}
                accessibilityLabel={`Total amount: ${formatPrice(getTotalAmount())}`}
              >
                {formatPrice(getTotalAmount())}
              </Text>
            </View>
            
            {/* Last Updated */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Last Updated:</Text>
              <Text style={styles.summaryValue}>
                {new Date(cart.updatedAt).toLocaleTimeString()}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.checkoutButton,
              (!cart || cart.items.length === 0) && styles.checkoutButtonDisabled
            ]}
            onPress={handleCheckout}
            disabled={!cart || cart.items.length === 0}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Checkout button"
            accessibilityHint="Proceeds to payment screen"
          >
            <Text style={styles.checkoutButtonText}>
              {cart && cart.items.length > 0 ? 'Checkout' : 'Cart Empty'}
            </Text>
          </TouchableOpacity>
          
          {cart && cart.items.length === 0 && (
            <Text style={styles.emptyCartHint}>
              Add items to your cart to enable checkout
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#2C3E50',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 24,
  },
  cartSection: {
    flex: 2,
    marginRight: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  testButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rfidTestButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  rfidTestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rfidTestResultText: {
    fontSize: 14,
    color: '#2C3E50',
    marginTop: 10,
    textAlign: 'center',
  },
  rfidItemsButton: {
    backgroundColor: '#9B59B6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  rfidItemsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rfidItemsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  rfidItemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  rfidItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  rfidItemInfo: {
    flex: 1,
  },
  rfidItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  rfidItemPrice: {
    fontSize: 14,
    color: '#27AE60',
    fontWeight: '600',
    marginBottom: 4,
  },
  rfidItemTag: {
    fontSize: 12,
    color: '#6C757D',
    fontFamily: 'monospace',
  },
  simulateRfidButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  simulateRfidButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  noRfidItemsText: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  summarySection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    color: '#27AE60',
    fontWeight: '600',
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 20,
    color: '#6C757D',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 16,
  },
  cartIdContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartIdLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '600',
  },
  cartIdValue: {
    fontSize: 12,
    color: '#2C3E50',
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  summaryContent: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#2C3E50',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  checkoutButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyCartHint: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 16,
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#27AE60',
    marginRight: 8,
  },
  indicatorText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  realtimeNote: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 16,
  },
}); 