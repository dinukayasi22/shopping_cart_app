#!/usr/bin/env node

/**
 * RFID Functionality Test Script
 * 
 * This script demonstrates how to test the RFID functionality
 * without running the full React Native app.
 * 
 * Usage: node scripts/test-rfid.js
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, query, orderByChild, equalTo } = require('firebase/database');

// Firebase configuration (same as in the app)
const firebaseConfig = {

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Test RFID tag from the user's request
const TEST_RFID_TAG = "E28069150000401B2847F571";

/**
 * Test 1: Get item by RFID tag
 */
async function testGetItemByRfidTag() {
  console.log('\n🔍 Test 1: Getting item by RFID tag');
  console.log(`RFID Tag: ${TEST_RFID_TAG}`);
  
  try {
    const itemsRef = ref(database, 'items');
    const itemsQuery = query(itemsRef, orderByChild('rfidTag'), equalTo(TEST_RFID_TAG));
    const snapshot = await get(itemsQuery);
    
    if (snapshot.exists()) {
      const itemsData = snapshot.val();
      const itemId = Object.keys(itemsData)[0];
      const rawItem = itemsData[itemId];
      
      // Handle both uppercase and lowercase field names
      const item = {
        id: rawItem.id || rawItem.Id || itemId,
        name: rawItem.name || rawItem.Name || 'Unknown Item',
        price: typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : 
               typeof rawItem.Price === 'string' ? parseFloat(rawItem.Price) :
               rawItem.price || rawItem.Price || 0,
        rfidTag: rawItem.rfidTag || rawItem.RfidTag || '',
        description: rawItem.description || rawItem.Description || 'No description',
        category: rawItem.category || rawItem.Category || 'No category'
      };
      
      console.log('✅ Item found successfully!');
      console.log('Item details:', item);
      
      return item;
    } else {
      console.log('❌ No item found with this RFID tag');
      console.log('💡 Make sure you have an item in your Firebase "items" table with this RFID tag');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting item by RFID tag:', error.message);
    return null;
  }
}

/**
 * Test 2: Get all items with RFID tags
 */
async function testGetAllRfidItems() {
  console.log('\n📋 Test 2: Getting all items with RFID tags');
  
  try {
    const itemsRef = ref(database, 'items');
    const snapshot = await get(itemsRef);
    
    if (snapshot.exists()) {
      const itemsData = snapshot.val();
      const itemsWithRfid = [];
      
      Object.entries(itemsData).forEach(([itemId, rawItem]) => {
        // Check for RFID tag in both cases
        const rfidTag = rawItem.rfidTag || rawItem.RfidTag;
        if (rfidTag) {
          itemsWithRfid.push({
            id: rawItem.id || rawItem.Id || itemId,
            name: rawItem.name || rawItem.Name || 'Unknown Item',
            price: typeof rawItem.price === 'string' ? parseFloat(rawItem.price) : 
                   typeof rawItem.Price === 'string' ? parseFloat(rawItem.Price) :
                   rawItem.price || rawItem.Price || 0,
            rfidTag: rfidTag
          });
        }
      });
      
      if (itemsWithRfid.length > 0) {
        console.log(`✅ Found ${itemsWithRfid.length} item(s) with RFID tags:`);
        itemsWithRfid.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.name} - Rs. ${item.price} (Tag: ${item.rfidTag})`);
        });
      } else {
        console.log('❌ No items with RFID tags found');
        console.log('💡 Add items to your Firebase "items" table with "rfidTag" field');
      }
      
      return itemsWithRfid;
    } else {
      console.log('❌ No items found in database');
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting all RFID items:', error.message);
    return [];
  }
}

/**
 * Test 3: Get carts containing a specific item
 */
async function testGetCartsByItemId(itemId) {
  console.log('\n🛒 Test 3: Getting carts containing a specific item');
  console.log(`Item ID: ${itemId}`);
  
  try {
    const cartsRef = ref(database, 'carts');
    const snapshot = await get(cartsRef);
    
    if (snapshot.exists()) {
      const cartsData = snapshot.val();
      const cartsWithItem = [];
      
      Object.values(cartsData).forEach((cart) => {
        if (cart.items && cart.items.some(item => item.id === itemId)) {
          cartsWithItem.push({
            id: cart.id,
            itemCount: cart.items.length,
            totalAmount: cart.totalAmount,
            createdAt: cart.createdAt
          });
        }
      });
      
      if (cartsWithItem.length > 0) {
        console.log(`✅ Found ${cartsWithItem.length} cart(s) containing this item:`);
        cartsWithItem.forEach((cart, index) => {
          console.log(`  ${index + 1}. Cart ${cart.id} - ${cart.itemCount} items, Total: Rs. ${cart.totalAmount}`);
        });
      } else {
        console.log('ℹ️ No carts found containing this item');
        console.log('💡 This item has not been added to any cart yet');
      }
      
      return cartsWithItem;
    } else {
      console.log('❌ No carts found in database');
      return [];
    }
  } catch (error) {
    console.error('❌ Error getting carts by item ID:', error.message);
    return [];
  }
}

/**
 * Test 4: Database structure validation
 */
async function testDatabaseStructure() {
  console.log('\n🏗️ Test 4: Database structure validation');
  
  try {
    // Check items table structure
    const itemsRef = ref(database, 'items');
    const itemsSnapshot = await get(itemsRef);
    
    if (itemsSnapshot.exists()) {
      const itemsData = itemsSnapshot.val();
      const firstItem = Object.values(itemsData)[0];
      
      console.log('✅ Items table exists');
      console.log('Sample item structure:', Object.keys(firstItem));
      
      // Check required fields (handle both cases)
      const requiredFields = ['id', 'name', 'price', 'rfidTag'];
      const missingFields = requiredFields.filter(field => {
        const upperField = field.charAt(0).toUpperCase() + field.slice(1);
        return !(field in firstItem) && !(upperField in firstItem);
      });
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields are present');
        console.log('💡 Note: Your data uses uppercase field names (Name, Price) which is supported');
      } else {
        console.log('❌ Missing required fields:', missingFields);
        console.log('💡 Make sure your items have: id, name/Name, price/Price, rfidTag/rfidTag');
        console.log('💡 Current format detected:', Object.keys(firstItem));
      }
      
      // Check data types
      const price = firstItem.price || firstItem.Price;
      if (price !== undefined) {
        if (typeof price === 'string') {
          console.log('ℹ️ Price is stored as string (will be converted to number)');
        } else if (typeof price === 'number') {
          console.log('✅ Price is stored as number');
        }
      }
      
    } else {
      console.log('❌ Items table is empty or does not exist');
    }
    
    // Check carts table structure
    const cartsRef = ref(database, 'carts');
    const cartsSnapshot = await get(cartsRef);
    
    if (cartsSnapshot.exists()) {
      console.log('✅ Carts table exists');
    } else {
      console.log('ℹ️ Carts table is empty (this is normal for a new app)');
    }
    
  } catch (error) {
    console.error('❌ Error validating database structure:', error.message);
  }
}

/**
 * Main test function
 */
async function runAllTests() {
  console.log('🚀 Starting RFID Functionality Tests');
  console.log('=====================================');
  
  // Test database structure first
  await testDatabaseStructure();
  
  // Test getting all RFID items
  const allItems = await testGetAllRfidItems();
  
  // Test getting specific item by RFID tag
  const testItem = await testGetItemByRfidTag();
  
  // If we found the test item, test cart functionality
  if (testItem) {
    await testGetCartsByItemId(testItem.id);
  }
  
  console.log('\n🎯 Test Summary');
  console.log('================');
  console.log(`Total RFID items found: ${allItems.length}`);
  console.log(`Test RFID tag "${TEST_RFID_TAG}": ${testItem ? '✅ Found' : '❌ Not found'}`);
  
  if (!testItem) {
    console.log('\n💡 To fix the test:');
    console.log('1. Add an item to your Firebase "items" table');
    console.log('2. Include the field "rfidTag" with value "E28069150000401B2847F571"');
    console.log('3. Make sure the item has: id, name, price, rfidTag fields');
    console.log('4. Run this test again');
  }
  
  console.log('\n✨ Tests completed!');
}

// Run the tests
runAllTests().catch(console.error);
