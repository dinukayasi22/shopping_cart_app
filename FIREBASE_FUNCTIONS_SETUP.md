# Firebase Cloud Functions Setup Guide

This guide explains how to set up Firebase Cloud Functions to work with your existing Arduino code without changing it.

## Overview

Your Arduino code:
1. **First scan**: Stores `rfid_id: tagID` in `items/{tagID}`
2. **Subsequent scans**: Moves to `scanned_items/{tagID}_{timestamp}` with `item_id: tagID` and deletes from `items`

Our Firebase Functions:
1. **`processScannedItem`**: Listens to `scanned_items` table and automatically adds items to active cart
2. **`syncItemToCatalog`**: Syncs items from `items` table to `items_catalog` for item details
3. **`updateItemCatalog`**: Callable function to update item details in catalog

## Firebase Database Structure

```
Firebase Realtime Database
├── items/
│   └── {tagID}/
│       └── rfid_id: "E28069150000401B2847F571"  (Arduino stores this)
│
├── scanned_items/
│   └── {tagID}_{timestamp}/
│       └── item_id: "E28069150000401B2847F571"  (Arduino moves here)
│
├── items_catalog/
│   └── {tagID}/
│       ├── id: "E28069150000401B2847F571"
│       ├── name: "Red Rice"
│       ├── price: 900
│       ├── rfidTag: "E28069150000401B2847F571"
│       └── ...
│
├── active_cart/
│   └── cartId: "cart_12345"
│
└── carts/
    └── {cartId}/
        ├── id: "cart_12345"
        ├── items: [...]
        ├── totalAmount: 900
        ├── status: "active"
        └── ...
```

## Setup Instructions

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase Functions

```bash
cd firebase-functions
npm install
```

### Step 4: Deploy Functions

```bash
firebase deploy --only functions
```

## How It Works

### Flow Diagram

```
1. Arduino scans RFID tag for first time
   ↓
2. Arduino stores rfid_id in items/{tagID}
   ↓
3. Firebase Function: syncItemToCatalog
   - Creates entry in items_catalog/{tagID}
   - Uses default values (name: "Item {tagID}", price: 0)
   ↓
4. User updates item details in items_catalog (via app or admin)
   ↓
5. Arduino scans same RFID tag again
   ↓
6. Arduino moves to scanned_items/{tagID}_{timestamp}
   ↓
7. Firebase Function: processScannedItem
   - Gets item_id (RFID tag) from scanned_items
   - Looks up item in items_catalog
   - Gets active cart ID
   - Adds item to active cart
   ↓
8. Cart app automatically updates (real-time sync)
```

## Firebase Functions Explained

### 1. processScannedItem

**Trigger**: When a new entry is created in `scanned_items` table

**What it does**:
- Gets `item_id` (RFID tag) from the scanned item
- Gets active cart ID from `active_cart/cartId`
- Checks if cart status is "active"
- Looks up item details in `items_catalog`
- Adds item to cart's items array
- Updates cart total amount

**Example**:
```javascript
// When Arduino creates:
scanned_items/E28069150000401B2847F571_1704067200/
  item_id: "E28069150000401B2847F571"

// Function automatically:
// 1. Gets active cart ID
// 2. Looks up item in items_catalog/E28069150000401B2847F571
// 3. Adds to cart.items array
// 4. Updates cart.totalAmount
```

### 2. syncItemToCatalog

**Trigger**: When a new entry is created in `items` table

**What it does**:
- Gets `rfid_id` from the item (Arduino structure)
- Creates entry in `items_catalog` if it doesn't exist
- Uses default values (can be updated later)

**Example**:
```javascript
// When Arduino creates:
items/E28069150000401B2847F571/
  rfid_id: "E28069150000401B2847F571"

// Function automatically creates:
items_catalog/E28069150000401B2847F571/
  id: "E28069150000401B2847F571"
  name: "Item E28069150000401B2847F571"
  price: 0
  rfidTag: "E28069150000401B2847F571"
```

### 3. updateItemCatalog

**Type**: Callable function (can be called from your app)

**What it does**:
- Updates item details in `items_catalog`
- Can be called from your React Native app to set item name, price, etc.

**Usage from App**:
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const updateItemCatalog = httpsCallable(functions, 'updateItemCatalog');

await updateItemCatalog({
  rfidTag: 'E28069150000401B2847F571',
  itemData: {
    name: 'Red Rice',
    price: 900,
    description: 'Premium red rice',
    category: 'Grains'
  }
});
```

## Setting Up Items Catalog

### Option 1: Use Firebase Console

1. Go to Firebase Console → Realtime Database
2. Navigate to `items_catalog`
3. Add items manually:
```json
{
  "E28069150000401B2847F571": {
    "id": "E28069150000401B2847F571",
    "name": "Red Rice",
    "price": 900,
    "rfidTag": "E28069150000401B2847F571",
    "description": "Premium red rice",
    "category": "Grains",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Option 2: Use Your App

Create an admin panel in your app to update item catalog using the `updateItemCatalog` function.

### Option 3: Import from CSV/JSON

Use Firebase Admin SDK or Firebase Console to import item data in bulk.

## Testing

### Test Flow

1. **Start Shopping Session**:
   - Open your cart app
   - Tap "Start Shopping"
   - Verify `active_cart/cartId` is set in Firebase Console

2. **First Scan** (Arduino):
   - Scan an RFID tag
   - Verify `items/{tagID}` is created with `rfid_id`
   - Verify `items_catalog/{tagID}` is created automatically

3. **Update Item Details**:
   - Update `items_catalog/{tagID}` with name and price
   - Or use `updateItemCatalog` function from app

4. **Second Scan** (Arduino):
   - Scan the same RFID tag
   - Verify item is moved to `scanned_items/{tagID}_{timestamp}`
   - Verify item is automatically added to active cart
   - Verify cart app updates within 2 seconds

### Check Firebase Console

1. **Active Cart**:
   ```
   active_cart/
     cartId: "cart_12345"
   ```

2. **Scanned Items**:
   ```
   scanned_items/
     E28069150000401B2847F571_1704067200/
       item_id: "E28069150000401B2847F571"
   ```

3. **Items Catalog**:
   ```
   items_catalog/
     E28069150000401B2847F571/
       name: "Red Rice"
       price: 900
   ```

4. **Cart**:
   ```
   carts/cart_12345/
     items: [
       {
         id: "E28069150000401B2847F571",
         name: "Red Rice",
         price: 900,
         quantity: 1,
         totalPrice: 900
       }
     ]
   ```

## Firebase Security Rules

Update your Firebase Realtime Database rules:

```json
{
  "rules": {
    "items": {
      ".read": true,
      ".write": true
    },
    "scanned_items": {
      ".read": true,
      ".write": true
    },
    "items_catalog": {
      ".read": true,
      ".write": true
    },
    "active_cart": {
      ".read": true,
      ".write": false
    },
    "carts": {
      "$cartId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

## Troubleshooting

### Items Not Added to Cart

1. **Check Active Cart**:
   - Verify `active_cart/cartId` exists
   - Verify cart status is "active"

2. **Check Items Catalog**:
   - Verify item exists in `items_catalog/{tagID}`
   - Verify item has name and price

3. **Check Function Logs**:
   ```bash
   firebase functions:log
   ```

4. **Check scanned_items**:
   - Verify item is created in `scanned_items`
   - Verify `item_id` field exists

### Function Not Triggering

1. **Check Function Deployment**:
   ```bash
   firebase functions:list
   ```

2. **Check Function Status**:
   - Go to Firebase Console → Functions
   - Verify functions are deployed and enabled

3. **Check Function Logs**:
   ```bash
   firebase functions:log --only processScannedItem
   ```

## Next Steps

1. ✅ Deploy Firebase Functions
2. ✅ Set up items_catalog with item details
3. ✅ Test with Arduino scans
4. ✅ Monitor function logs
5. ✅ Update item details as needed

## Cost Considerations

Firebase Cloud Functions:
- **Free tier**: 2 million invocations/month
- **Pricing**: $0.40 per million invocations after free tier

For a shopping cart system, this should be well within the free tier for most use cases.

