# Simple REST API Guide for Arduino RFID Reader

This guide provides a simpler approach using direct HTTP REST API calls from Arduino to Firebase.

## Overview

Your Arduino will make HTTP REST API calls to Firebase Realtime Database to:
1. Get the active cart ID
2. Find items by RFID tag
3. Add items to the active cart

## Firebase Database Structure

```
active_cart/
  └── cartId: "cart_12345"

carts/
  └── {cartId}/
      ├── id: "cart_12345"
      ├── items: [array of items]
      ├── totalAmount: 100.00
      ├── status: "active"
      └── updatedAt: "2024-01-01T12:00:00.000Z"

items/
  └── {itemId}/
      ├── id: "item_001"
      ├── name: "Red Rice"
      ├── price: 900
      ├── rfidTag: "E28069150000401B2847F571"
      └── ...
```

## Arduino Code (Simplified)

### Prerequisites
- WiFi connection
- HTTP client library (ESP8266HTTPClient or HTTPClient for ESP32)
- ArduinoJson library

### Step 1: Get Active Cart ID

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* firebaseHost = "webapp-d9035-default-rtdb.firebaseio.com";
const char* firebaseAuth = "YOUR_FIREBASE_AUTH_TOKEN";  // Optional for authenticated access

String getActiveCartId() {
  HTTPClient http;
  String url = "https://" + String(firebaseHost) + "/active_cart/cartId.json";
  if (firebaseAuth) {
    url += "?auth=" + String(firebaseAuth);
  }
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    // Remove quotes from response
    payload.trim();
    payload.remove(0, 1);  // Remove first quote
    payload.remove(payload.length() - 1, 1);  // Remove last quote
    http.end();
    return payload;
  } else {
    Serial.println("Error getting active cart: " + String(httpCode));
    http.end();
    return "";
  }
}
```

### Step 2: Find Item by RFID Tag

```cpp
String findItemByRfidTag(String rfidTag) {
  HTTPClient http;
  String url = "https://" + String(firebaseHost) + "/items.json?orderBy=\"rfidTag\"&equalTo=\"" + rfidTag + "\"";
  if (firebaseAuth) {
    url += "&auth=" + String(firebaseAuth);
  }
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    http.end();
    
    // Parse JSON response
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, payload);
    
    // Get first item from the response
    JsonObject itemObj = doc.as<JsonObject>().begin()->value().as<JsonObject>();
    
    // Extract item details
    String itemId = itemObj["id"].as<String>();
    String itemName = itemObj["name"].as<String>();
    float itemPrice = itemObj["price"].as<float>();
    
    // Return JSON string with item details
    String result = "{";
    result += "\"id\":\"" + itemId + "\",";
    result += "\"name\":\"" + itemName + "\",";
    result += "\"price\":" + String(itemPrice) + "}";
    
    return result;
  } else {
    Serial.println("Error finding item: " + String(httpCode));
    http.end();
    return "";
  }
}
```

### Step 3: Get Current Cart Data

```cpp
String getCartData(String cartId) {
  HTTPClient http;
  String url = "https://" + String(firebaseHost) + "/carts/" + cartId + ".json";
  if (firebaseAuth) {
    url += "?auth=" + String(firebaseAuth);
  }
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    http.end();
    return payload;
  } else {
    Serial.println("Error getting cart: " + String(httpCode));
    http.end();
    return "";
  }
}
```

### Step 4: Update Cart with New Item

```cpp
bool addItemToCart(String cartId, String itemJson) {
  // Parse item JSON
  DynamicJsonDocument itemDoc(512);
  deserializeJson(itemDoc, itemJson);
  
  String itemId = itemDoc["id"].as<String>();
  String itemName = itemDoc["name"].as<String>();
  float itemPrice = itemDoc["price"].as<float>();
  
  // Get current cart
  String cartData = getCartData(cartId);
  if (cartData == "") {
    return false;
  }
  
  // Parse cart JSON
  DynamicJsonDocument cartDoc(4096);
  deserializeJson(cartDoc, cartData);
  
  // Check cart status
  String status = cartDoc["status"].as<String>();
  if (status != "active") {
    Serial.println("Cart is not active. Status: " + status);
    return false;
  }
  
  // Get items array
  JsonArray items = cartDoc["items"].as<JsonArray>();
  
  // Check if item exists
  bool itemExists = false;
  int itemIndex = -1;
  for (int i = 0; i < items.size(); i++) {
    if (items[i]["id"].as<String>() == itemId) {
      itemExists = true;
      itemIndex = i;
      break;
    }
  }
  
  // Update or add item
  if (itemExists) {
    // Increment quantity
    int currentQty = items[itemIndex]["quantity"].as<int>();
    items[itemIndex]["quantity"] = currentQty + 1;
    items[itemIndex]["totalPrice"] = (currentQty + 1) * itemPrice;
  } else {
    // Add new item
    JsonObject newItem = items.createNestedObject();
    newItem["id"] = itemId;
    newItem["name"] = itemName;
    newItem["price"] = itemPrice;
    newItem["quantity"] = 1;
    newItem["totalPrice"] = itemPrice;
  }
  
  // Calculate total amount
  float totalAmount = 0;
  for (int i = 0; i < items.size(); i++) {
    totalAmount += items[i]["totalPrice"].as<float>();
  }
  
  // Update cart
  cartDoc["totalAmount"] = totalAmount;
  cartDoc["updatedAt"] = getCurrentTimestamp();  // You'll need to implement this
  
  // Send update to Firebase
  HTTPClient http;
  String url = "https://" + String(firebaseHost) + "/carts/" + cartId + ".json";
  if (firebaseAuth) {
    url += "?auth=" + String(firebaseAuth);
  }
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  String jsonPayload;
  serializeJson(cartDoc, jsonPayload);
  
  int httpCode = http.PATCH(jsonPayload);
  http.end();
  
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("Item added to cart successfully");
    return true;
  } else {
    Serial.println("Error updating cart: " + String(httpCode));
    return false;
  }
}
```

### Step 5: Complete Flow

```cpp
void processRfidTag(String rfidTag) {
  Serial.println("Processing RFID tag: " + rfidTag);
  
  // Step 1: Get active cart ID
  String cartId = getActiveCartId();
  if (cartId == "") {
    Serial.println("No active cart found");
    return;
  }
  Serial.println("Active cart: " + cartId);
  
  // Step 2: Find item by RFID tag
  String itemJson = findItemByRfidTag(rfidTag);
  if (itemJson == "") {
    Serial.println("Item not found for RFID: " + rfidTag);
    return;
  }
  Serial.println("Item found: " + itemJson);
  
  // Step 3: Add item to cart
  if (addItemToCart(cartId, itemJson)) {
    Serial.println("Successfully added item to cart");
  } else {
    Serial.println("Failed to add item to cart");
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
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

## Helper Function: Get Current Timestamp

```cpp
String getCurrentTimestamp() {
  // You'll need to get the current time from an NTP server
  // Or use a simple timestamp format
  // For now, return a placeholder
  return "2024-01-01T12:00:00.000Z";
  
  // For production, implement NTP time sync:
  // configTime(0, 0, "pool.ntp.org");
  // struct tm timeinfo;
  // if (getLocalTime(&timeinfo)) {
  //   char buffer[30];
  //   strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%S.000Z", &timeinfo);
  //   return String(buffer);
  // }
}
```

## Firebase Security Rules

Update your Firebase Realtime Database rules:

```json
{
  "rules": {
    "active_cart": {
      ".read": true,
      ".write": false
    },
    "carts": {
      "$cartId": {
        ".read": true,
        ".write": true,
        ".validate": "newData.child('status').val() == 'active' || newData.child('status').val() == 'checkout' || newData.child('status').val() == 'completed'"
      }
    },
    "items": {
      ".read": true,
      ".write": false
    }
  }
}
```

## Testing

1. **Test Active Cart**: Call `getActiveCartId()` and verify it returns a cart ID
2. **Test Item Lookup**: Call `findItemByRfidTag("E28069150000401B2847F571")` and verify item details
3. **Test Add Item**: Call `addItemToCart()` and verify the item appears in Firebase Console
4. **Monitor**: Watch Firebase Console → Realtime Database → `carts/{cartId}/items` to see items being added

## Error Handling

- **No Active Cart**: Check if user has started shopping session
- **Item Not Found**: Verify RFID tag exists in `items` collection
- **Cart Not Active**: Cart might be in checkout or completed status
- **Network Errors**: Implement retry logic for failed requests

## Optimization Tips

1. **Cache Active Cart ID**: Store the active cart ID locally to avoid repeated API calls
2. **Debounce RFID Reads**: Wait 1-2 seconds between RFID tag reads
3. **Batch Updates**: If multiple items are scanned quickly, batch them together
4. **Error Recovery**: Implement retry logic with exponential backoff

## Security Notes

1. Use Firebase Authentication tokens for production
2. Implement rate limiting on Arduino side
3. Validate RFID tags before processing
4. Monitor Firebase usage and set up alerts

