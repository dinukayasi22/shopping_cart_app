# Arduino UHF RFID Reader Integration Guide

This guide explains how to integrate your UHF RFID reader (Arduino) with the Firebase Realtime Database to automatically add items to the active shopping cart.

## Architecture Overview

```
User taps "Start Shopping" 
    ↓
Cart created in Firebase with status: "active"
    ↓
active_cart reference set in Firebase
    ↓
Arduino reads active_cart_id from Firebase
    ↓
UHF RFID reader scans RFID tag
    ↓
Arduino calls Firebase to add item to active cart
    ↓
Cart app automatically updates (real-time sync)
```

## Firebase Database Structure

### 1. Active Cart Reference
```
active_cart/
  ├── cartId: "cart_12345"
  └── updatedAt: "2024-01-01T12:00:00.000Z"
```

### 2. Carts Collection
```
carts/
  └── {cartId}/
      ├── id: "cart_12345"
      ├── items: [...]
      ├── totalAmount: 100.00
      ├── status: "active" | "checkout" | "completed" | "abandoned"
      ├── createdAt: "2024-01-01T12:00:00.000Z"
      └── updatedAt: "2024-01-01T12:00:00.000Z"
```

### 3. Items Collection (Your existing structure)
```
items/
  └── {itemId}/
      ├── id: "item_001"
      ├── name: "Red Rice"
      ├── price: 900
      ├── rfidTag: "E28069150000401B2847F571"
      └── ...
```

## Implementation Options

### Option 1: Direct Firebase REST API (Recommended for Arduino)

Your Arduino can directly call Firebase REST API endpoints to:
1. Read the active cart ID
2. Look up items by RFID tag
3. Add items to the cart

### Option 2: Firebase Realtime Database Listeners

Arduino can listen to Firebase Realtime Database changes and automatically react when:
- A new active cart is created
- Items need to be added

## Arduino Code Structure

### Prerequisites
1. **Firebase Arduino Library**: Install `Firebase-ESP32` or `Firebase-ESP8266` library
2. **WiFi Connection**: Arduino must be connected to WiFi
3. **Firebase Credentials**: You'll need your Firebase database URL and authentication

### Step 1: Get Active Cart ID

```cpp
#include <FirebaseESP32.h>  // or FirebaseESP8266 for ESP8266

#define FIREBASE_HOST "webapp-d9035-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "YOUR_FIREBASE_SECRET_KEY"  // Get from Firebase Console

FirebaseData firebaseData;

String getActiveCartId() {
  String path = "/active_cart/cartId";
  
  if (Firebase.get(firebaseData, path)) {
    if (firebaseData.dataType() == "string") {
      return firebaseData.stringData();
    }
  } else {
    Serial.println("Error getting active cart: " + firebaseData.errorReason());
    return "";
  }
  return "";
}
```

### Step 2: Get Item by RFID Tag

```cpp
String getItemByRfidTag(String rfidTag) {
  String path = "/items";
  
  // Query items where rfidTag equals the scanned tag
  FirebaseJson json;
  json.set("orderBy", "\"rfidTag\"");
  json.set("equalTo", "\"" + rfidTag + "\"");
  
  if (Firebase.get(firebaseData, path, json)) {
    FirebaseJsonData jsonData;
    FirebaseJsonData jsonDataId;
    
    if (firebaseData.jsonObject().get(jsonData, "results")) {
      // Parse the first item from results
      String itemId = "";  // Extract item ID from response
      return itemId;
    }
  }
  return "";
}
```

### Step 3: Add Item to Active Cart

```cpp
bool addItemToCart(String cartId, String itemId, String itemName, float itemPrice) {
  // First, get the current cart
  String cartPath = "/carts/" + cartId;
  FirebaseJson cartJson;
  
  if (!Firebase.get(firebaseData, cartPath)) {
    Serial.println("Error getting cart: " + firebaseData.errorReason());
    return false;
  }
  
  cartJson = firebaseData.jsonObject();
  
  // Check if cart status is "active"
  FirebaseJsonData statusData;
  if (!cartJson.get(statusData, "status") || statusData.stringValue() != "active") {
    Serial.println("Cart is not active");
    return false;
  }
  
  // Get current items array
  FirebaseJsonData itemsData;
  cartJson.get(itemsData, "items");
  FirebaseJsonArray itemsArray = itemsData.jsonArray();
  
  // Check if item already exists in cart
  bool itemExists = false;
  int itemIndex = -1;
  
  for (int i = 0; i < itemsArray.size(); i++) {
    FirebaseJsonData itemData;
    itemsArray.get(itemData, i);
    FirebaseJson itemJson = itemData.jsonObject();
    
    FirebaseJsonData idData;
    itemJson.get(idData, "id");
    if (idData.stringValue() == itemId) {
      itemExists = true;
      itemIndex = i;
      break;
    }
  }
  
  // Update or add item
  if (itemExists) {
    // Increment quantity
    FirebaseJsonData itemData;
    itemsArray.get(itemData, itemIndex);
    FirebaseJson itemJson = itemData.jsonObject();
    
    FirebaseJsonData qtyData;
    itemJson.get(qtyData, "quantity");
    int newQty = qtyData.intValue() + 1;
    itemJson.set("quantity", newQty);
    itemJson.set("totalPrice", newQty * itemPrice);
    
    itemsArray.set(itemIndex, itemJson);
  } else {
    // Add new item
    FirebaseJson newItem;
    newItem.set("id", itemId);
    newItem.set("name", itemName);
    newItem.set("price", itemPrice);
    newItem.set("quantity", 1);
    newItem.set("totalPrice", itemPrice);
    
    itemsArray.add(newItem);
  }
  
  // Calculate new total
  float totalAmount = 0;
  for (int i = 0; i < itemsArray.size(); i++) {
    FirebaseJsonData itemData;
    itemsArray.get(itemData, i);
    FirebaseJson itemJson = itemData.jsonObject();
    
    FirebaseJsonData totalData;
    itemJson.get(totalData, "totalPrice");
    totalAmount += totalData.floatValue();
  }
  
  // Update cart
  cartJson.set("items", itemsArray);
  cartJson.set("totalAmount", totalAmount);
  cartJson.set("updatedAt", Firebase.getCurrentTime());
  
  String updatePath = "/carts/" + cartId;
  if (Firebase.updateNode(firebaseData, updatePath, cartJson)) {
    Serial.println("Item added to cart successfully");
    return true;
  } else {
    Serial.println("Error updating cart: " + firebaseData.errorReason());
    return false;
  }
}
```

### Step 4: Complete RFID Reading Flow

```cpp
void processRfidTag(String rfidTag) {
  Serial.println("RFID Tag detected: " + rfidTag);
  
  // Step 1: Get active cart ID
  String cartId = getActiveCartId();
  if (cartId == "") {
    Serial.println("No active cart found");
    return;
  }
  
  Serial.println("Active cart ID: " + cartId);
  
  // Step 2: Get item by RFID tag
  String itemId = getItemByRfidTag(rfidTag);
  if (itemId == "") {
    Serial.println("Item not found for RFID tag: " + rfidTag);
    return;
  }
  
  // Step 3: Get item details (name, price)
  String itemPath = "/items/" + itemId;
  FirebaseJson itemJson;
  
  if (Firebase.get(firebaseData, itemPath)) {
    itemJson = firebaseData.jsonObject();
    
    FirebaseJsonData nameData, priceData;
    itemJson.get(nameData, "name");
    itemJson.get(priceData, "price");
    
    String itemName = nameData.stringValue();
    float itemPrice = priceData.floatValue();
    
    // Step 4: Add item to cart
    if (addItemToCart(cartId, itemId, itemName, itemPrice)) {
      Serial.println("Successfully added " + itemName + " to cart");
    } else {
      Serial.println("Failed to add item to cart");
    }
  } else {
    Serial.println("Error getting item details: " + firebaseData.errorReason());
  }
}

void loop() {
  // Your RFID reading code here
  if (rfidReader.available()) {
    String rfidTag = rfidReader.readTag();
    processRfidTag(rfidTag);
    delay(1000);  // Debounce - wait 1 second between reads
  }
}
```

## Alternative: Simpler REST API Approach

If the Firebase Arduino library is too complex, you can use HTTP REST API calls:

### Get Active Cart ID
```
GET https://webapp-d9035-default-rtdb.firebaseio.com/active_cart/cartId.json?auth=YOUR_AUTH_TOKEN
```

### Get Item by RFID Tag
```
GET https://webapp-d9035-default-rtdb.firebaseio.com/items.json?orderBy="rfidTag"&equalTo="E28069150000401B2847F571"&auth=YOUR_AUTH_TOKEN
```

### Update Cart (Add Item)
```
PATCH https://webapp-d9035-default-rtdb.firebaseio.com/carts/{cartId}.json?auth=YOUR_AUTH_TOKEN

Body:
{
  "items": [...updated items array...],
  "totalAmount": 100.00,
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

## Firebase Security Rules

Update your Firebase Realtime Database rules to allow Arduino to read/write:

```json
{
  "rules": {
    "active_cart": {
      ".read": true,
      ".write": true
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
      ".write": false
    }
  }
}
```

**Note**: For production, use authentication tokens instead of allowing public read/write.

## Cart Status Flow

1. **active**: Cart is being used for shopping (RFID reader can add items)
2. **checkout**: User has proceeded to payment (RFID reader should stop adding items)
3. **completed**: Payment completed successfully (cart is closed)
4. **abandoned**: Cart was abandoned (can be cleaned up later)

## Testing

1. Start the cart app and tap "Start Shopping"
2. Check Firebase Console → Realtime Database → `active_cart` to see the cart ID
3. Scan an RFID tag with your Arduino
4. Check Firebase Console → Realtime Database → `carts/{cartId}/items` to see the item added
5. The cart app should automatically update within 2 seconds (real-time sync)

## Troubleshooting

### No Active Cart Found
- Ensure the user has tapped "Start Shopping" in the app
- Check Firebase Console to verify `active_cart` exists
- Verify WiFi connection on Arduino

### Item Not Found
- Verify the RFID tag exists in the `items` collection
- Check that the `rfidTag` field matches exactly (case-sensitive)
- Ensure the item data structure is correct

### Cart Not Updating
- Check cart status is "active" (not "checkout" or "completed")
- Verify Firebase write permissions
- Check Arduino serial monitor for error messages

## Security Considerations

1. **Authentication**: Use Firebase Authentication tokens for Arduino
2. **Rate Limiting**: Implement debouncing to prevent rapid duplicate reads
3. **Error Handling**: Handle network failures gracefully
4. **Status Checking**: Always verify cart status before adding items

## Next Steps

1. Implement the Arduino code using one of the approaches above
2. Test with a few RFID tags
3. Monitor Firebase Console for data flow
4. Adjust debounce timing based on your RFID reader's behavior
5. Add error handling and retry logic for production use

