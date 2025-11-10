# RFID Integration Summary

## Answers to Your Questions

### 1. Where should I implement it - Arduino code or Firebase?

**Answer: Both!** Here's how:

- **Arduino Code**: Your Arduino will read RFID tags and make HTTP requests to Firebase
- **Firebase**: Stores the active cart reference and handles the data structure
- **App Code**: Already implemented to create carts and set active cart reference

### 2. Should we maintain a status of each cart_id?

**Answer: Yes!** Cart status is now implemented with the following states:

- **`active`**: Cart is being used for shopping (RFID reader can add items)
- **`checkout`**: User has proceeded to payment (RFID reader should stop adding items)
- **`completed`**: Payment completed successfully (cart is closed, active_cart is cleared)
- **`abandoned`**: Cart was abandoned (can be cleaned up later)

## How It Works

### Flow Diagram

```
1. User taps "Start Shopping" button
   ↓
2. App creates cart in Firebase with status: "active"
   ↓
3. App sets active_cart reference in Firebase
   ↓
4. Arduino reads active_cart/cartId from Firebase
   ↓
5. UHF RFID reader scans RFID tag
   ↓
6. Arduino queries items collection to find item by RFID tag
   ↓
7. Arduino adds item to active cart's items array
   ↓
8. Cart app automatically updates (real-time sync every 2 seconds)
```

### Firebase Database Structure

```
Firebase Realtime Database
├── active_cart/
│   ├── cartId: "cart_12345"
│   └── updatedAt: "2024-01-01T12:00:00.000Z"
│
├── carts/
│   └── {cartId}/
│       ├── id: "cart_12345"
│       ├── items: [
│       │     {
│       │       "id": "item_001",
│       │       "name": "Red Rice",
│       │       "price": 900,
│       │       "quantity": 1,
│       │       "totalPrice": 900
│       │     }
│       │   ]
│       ├── totalAmount: 900
│       ├── status: "active"
│       ├── createdAt: "2024-01-01T12:00:00.000Z"
│       └── updatedAt: "2024-01-01T12:00:00.000Z"
│
└── items/
    └── {itemId}/
        ├── id: "item_001"
        ├── name: "Red Rice"
        ├── price: 900
        ├── rfidTag: "E28069150000401B2847F571"
        └── ...
```

## Implementation Steps

### Step 1: App Side (Already Done ✅)

- ✅ Cart creation sets status to "active"
- ✅ Active cart reference is set in Firebase
- ✅ Cart status is updated during checkout
- ✅ Cart status is set to "completed" after payment
- ✅ Active cart is cleared when cart is completed/abandoned

### Step 2: Arduino Side (You Need to Implement)

Your Arduino needs to:

1. **Connect to WiFi**
2. **Read active cart ID** from `active_cart/cartId`
3. **Read RFID tags** from your UHF RFID reader
4. **Query items** collection to find item by `rfidTag`
5. **Update cart** by adding item to `carts/{cartId}/items` array
6. **Check cart status** - only add items if status is "active"

### Step 3: Firebase Security Rules

Update your Firebase Realtime Database rules to allow Arduino to read/write:

```json
{
  "rules": {
    "active_cart": {
      ".read": true,
      ".write": false  // Only app can write
    },
    "carts": {
      "$cartId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['id', 'items', 'totalAmount', 'status'])"
      }
    },
    "items": {
      ".read": true,
      ".write": false  // Items are managed separately
    }
  }
}
```

## Arduino Code Options

### Option 1: Firebase Arduino Library (Recommended)
- Use `Firebase-ESP32` or `Firebase-ESP8266` library
- See `ARDUINO_RFID_INTEGRATION.md` for detailed code

### Option 2: Simple HTTP REST API (Simpler)
- Use HTTP client library with REST API calls
- See `ARDUINO_SIMPLE_REST_API.md` for detailed code

## Key Functions for Arduino

### 1. Get Active Cart ID
```
GET https://webapp-d9035-default-rtdb.firebaseio.com/active_cart/cartId.json
```

### 2. Find Item by RFID Tag
```
GET https://webapp-d9035-default-rtdb.firebaseio.com/items.json?orderBy="rfidTag"&equalTo="E28069150000401B2847F571"
```

### 3. Update Cart (Add Item)
```
PATCH https://webapp-d9035-default-rtdb.firebaseio.com/carts/{cartId}.json

Body:
{
  "items": [...updated items array...],
  "totalAmount": 900,
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

## Status Management

### When Status Changes

1. **Cart Created**: Status = "active"
2. **User Checks Out**: Status = "checkout" (RFID should stop adding items)
3. **Payment Completed**: Status = "completed" (active_cart is cleared)
4. **Cart Abandoned**: Status = "abandoned" (active_cart is cleared)

### Arduino Should Check Status

Before adding items, Arduino should verify:
- Cart exists
- Cart status is "active"
- If status is "checkout" or "completed", don't add items

## Testing

1. **Start Shopping**: Tap "Start Shopping" in the app
2. **Check Firebase**: Verify `active_cart/cartId` exists in Firebase Console
3. **Scan RFID**: Use your Arduino to scan an RFID tag
4. **Verify**: Check `carts/{cartId}/items` in Firebase Console to see the item added
5. **Monitor App**: The cart app should automatically update within 2 seconds

## Troubleshooting

### No Active Cart Found
- Ensure user has tapped "Start Shopping"
- Check Firebase Console → `active_cart` exists
- Verify WiFi connection on Arduino

### Item Not Found
- Verify RFID tag exists in `items` collection
- Check `rfidTag` field matches exactly (case-sensitive)
- Ensure item data structure is correct

### Cart Not Updating
- Check cart status is "active" (not "checkout" or "completed")
- Verify Firebase write permissions
- Check Arduino serial monitor for error messages

### Items Not Appearing in App
- App syncs every 2 seconds automatically
- Verify cart ID matches in both Arduino and app
- Check Firebase Console to verify data is being written

## Next Steps

1. ✅ **App Side**: Already implemented and ready
2. ⏳ **Arduino Side**: Implement RFID reading and Firebase integration
3. ⏳ **Testing**: Test with a few RFID tags
4. ⏳ **Monitoring**: Set up Firebase Console monitoring
5. ⏳ **Production**: Add error handling and retry logic

## Files Reference

- `ARDUINO_RFID_INTEGRATION.md` - Detailed Arduino code with Firebase library
- `ARDUINO_SIMPLE_REST_API.md` - Simpler HTTP REST API approach
- `services/api.ts` - App-side API functions (already implemented)
- `context/CartContext.tsx` - Cart management (already implemented)

## Support

If you encounter issues:
1. Check Firebase Console for data flow
2. Monitor Arduino serial output
3. Verify WiFi connection
4. Check Firebase security rules
5. Verify cart status is "active"

