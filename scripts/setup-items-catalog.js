/**
 * Script to populate items_catalog in Firebase
 * This script helps you set up item details for RFID tags
 * 
 * Usage:
 * node scripts/setup-items-catalog.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Download from Firebase Console

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://webapp-d9035-default-rtdb.firebaseio.com'
});

const db = admin.database();

// Sample items catalog data
// Update this with your actual RFID tags and item details
const itemsCatalog = [
  {
    rfidTag: 'E28069150000401B2847F571',
    name: 'Red Rice',
    price: 900,
    description: 'Premium red rice',
    category: 'Grains'
  },
  // Add more items here
  // {
  //   rfidTag: 'YOUR_RFID_TAG_2',
  //   name: 'Item Name 2',
  //   price: 500,
  //   description: 'Item description',
  //   category: 'Category'
  // },
];

async function setupItemsCatalog() {
  console.log('Setting up items catalog...');
  
  for (const item of itemsCatalog) {
    try {
      const catalogRef = db.ref(`items_catalog/${item.rfidTag}`);
      
      const catalogItem = {
        id: item.rfidTag,
        name: item.name,
        price: item.price,
        rfidTag: item.rfidTag,
        description: item.description || '',
        category: item.category || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await catalogRef.set(catalogItem);
      console.log(`✅ Added item: ${item.name} (${item.rfidTag})`);
    } catch (error) {
      console.error(`❌ Error adding item ${item.rfidTag}:`, error);
    }
  }
  
  console.log('Items catalog setup complete!');
  process.exit(0);
}

setupItemsCatalog();

