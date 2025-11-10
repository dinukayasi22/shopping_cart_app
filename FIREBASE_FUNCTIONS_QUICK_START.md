# Firebase Functions Quick Start Guide

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Node.js 18+ installed
3. Firebase project set up

## Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
cd firebase-functions
npm install
```

### Step 2: Login to Firebase

```bash
firebase login
```

### Step 3: Initialize Firebase Project (if not already done)

```bash
firebase init functions
```

Select:
- Use existing project
- Choose your project: `webapp-d9035`
- Language: JavaScript
- ESLint: No (or Yes if you want)
- Install dependencies: Yes

### Step 4: Deploy Functions

```bash
firebase deploy --only functions
```

### Step 5: Set Up Items Catalog

#### Option A: Use Firebase Console

1. Go to Firebase Console → Realtime Database
2. Navigate to `items_catalog`
3. Add items manually with structure:
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

#### Option B: Use Script (requires serviceAccountKey.json)

1. Download service account key from Firebase Console
2. Save as `serviceAccountKey.json` in project root
3. Update `scripts/setup-items-catalog.js` with your items
4. Run: `node scripts/setup-items-catalog.js`

### Step 6: Deploy Database Rules

```bash
firebase deploy --only database:rules
```

## Testing

### Test 1: First Scan

1. Start shopping session in your app
2. Scan an RFID tag with Arduino
3. Check Firebase Console:
   - `items/{tagID}` should be created with `rfid_id`
   - `items_catalog/{tagID}` should be created automatically (with default values)

### Test 2: Update Item Details

1. Update `items_catalog/{tagID}` in Firebase Console with name and price
2. Or use the `updateItemCatalog` callable function from your app

### Test 3: Second Scan

1. Scan the same RFID tag again
2. Check Firebase Console:
   - Item should be moved to `scanned_items/{tagID}_{timestamp}`
   - Item should be added to `carts/{cartId}/items`
   - Cart `totalAmount` should be updated

### Test 4: Verify Cart App

1. Open your cart app
2. Cart should automatically update within 2 seconds
3. Scanned item should appear in cart

## Monitoring

### View Function Logs

```bash
firebase functions:log
```

### View Specific Function Logs

```bash
firebase functions:log --only processScannedItem
firebase functions:log --only syncItemToCatalog
```

### View in Firebase Console

1. Go to Firebase Console → Functions
2. Click on function name
3. View logs and metrics

## Troubleshooting

### Functions Not Deploying

1. Check Node.js version: `node --version` (should be 18+)
2. Check Firebase CLI: `firebase --version`
3. Check project: `firebase projects:list`

### Functions Not Triggering

1. Check function status in Firebase Console
2. Check function logs for errors
3. Verify database rules allow writes
4. Verify triggers are set up correctly

### Items Not Added to Cart

1. Check `active_cart/cartId` exists
2. Check cart status is "active"
3. Check `items_catalog/{tagID}` exists with name and price
4. Check function logs for errors

## Next Steps

1. ✅ Deploy functions
2. ✅ Set up items_catalog
3. ✅ Test with Arduino
4. ✅ Monitor function logs
5. ✅ Update item details as needed

## Support

If you encounter issues:
1. Check Firebase Console → Functions → Logs
2. Check Firebase Console → Realtime Database
3. Verify Arduino code is working correctly
4. Verify Firebase rules are deployed

