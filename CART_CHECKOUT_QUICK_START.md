# Cart & Checkout Quick Start Guide

This guide provides a fast-track overview for engineers getting started with the cart and checkout system.

---

## 🚀 Quick Setup (5 minutes)

### 1. Run the Migration
```bash
npm run migrate
```
This applies migration 059 which adds the `checkout_metadata` column.

### 2. Add Environment Variables
Add these to your `.env` file (defaults already in `.env.example`):

```bash
# Cart Requirement Adapters
CART_MAX_QUANTITY_PER_ITEM=99
CART_MAX_TOTAL_QUANTITY=500
CART_MAX_DISTINCT_ITEMS=100
CART_ALLOWED_CURRENCIES=USD
CART_WARN_AT_PERCENT=85

# Checkout Requirement Adapters
CHECKOUT_MAX_STORES=20
CHECKOUT_REQUIRE_ITEMS_IN_STOCK=true
CHECKOUT_MAX_SUBTOTAL_CENTS=1000000
```

### 3. Verify Installation
```bash
# Start server
npm start

# Test cart count endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/cart/count

# Test checkout readiness
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/checkout/readiness
```

---

## 📋 API Cheat Sheet

### Cart Operations

```bash
# Add item to cart
POST /api/v1/cart/items
{
  "storeId": 1,
  "productName": "Blue Sneakers",
  "productSku": "SKU123",
  "productUrl": "https://store.com/product",
  "productImageUrl": "https://store.com/image.jpg",
  "priceCents": 5999,
  "quantity": 1,
  "size": "10",
  "color": "Blue"
}

# Get cart with requirements
GET /api/v1/cart

# Get badge count (optimized)
GET /api/v1/cart/count

# Move item to favorites (swipe action)
POST /api/v1/cart/items/:id/move-to-favorites

# Remove item
DELETE /api/v1/cart/items/:id
```

### Checkout Flow

```bash
# 1. Check readiness
GET /api/v1/checkout/readiness

# 2. Initiate checkout
POST /api/v1/checkout/sessions

# 3. Add shipping address
PUT /api/v1/checkout/sessions/:sessionId/shipping
{
  "name": "John Doe",
  "address1": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "US"
}

# 4. Add recipient info
PUT /api/v1/checkout/sessions/:sessionId/recipient
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-555-5555"
}

# 5. Set billing preferences
PUT /api/v1/checkout/sessions/:sessionId/billing
{
  "sameAsShipping": true
}

# 6. Add payment method
PUT /api/v1/checkout/sessions/:sessionId/payment
{
  "paymentMethodId": "pm_1234567890",
  "storeId": 1
}

# 7. Apply promo code (optional)
PUT /api/v1/checkout/sessions/:sessionId/promo
{
  "code": "SAVE20"
}

# 8. Set shipping options (optional)
PUT /api/v1/checkout/sessions/:sessionId/shipping-options
{
  "selections": {
    "1": { "optionId": "standard" },
    "2": { "optionId": "express" }
  }
}

# 9. Place orders
POST /api/v1/checkout/sessions/:sessionId/place
```

---

## 🔒 Requirement Policies

### Cart Policies (Add/Update Time)
- ✅ Currency must be in `CART_ALLOWED_CURRENCIES` (default: USD)
- ✅ Quantity per item ≤ `CART_MAX_QUANTITY_PER_ITEM` (default: 99)
- ✅ Total cart quantity ≤ `CART_MAX_TOTAL_QUANTITY` (default: 500)
- ✅ Distinct items ≤ `CART_MAX_DISTINCT_ITEMS` (default: 100)
- ✅ Store not in `CART_BLOCKED_STORE_IDS`
- ✅ Product type not in `CART_BLOCKED_PRODUCT_TYPES`

### Checkout Policies (Initiation & Placement)
- ✅ Stores ≤ `CHECKOUT_MAX_STORES` (default: 20)
- ✅ Subtotal ≤ `CHECKOUT_MAX_SUBTOTAL_CENTS` (default: $10,000)
- ✅ All items in stock (if `CHECKOUT_REQUIRE_ITEMS_IN_STOCK=true`)
- ✅ Store not in `CHECKOUT_BLOCKED_STORE_IDS`
- ✅ Product type not in `CHECKOUT_BLOCKED_PRODUCT_TYPES`

### Policy Response Example
```json
{
  "requirements": {
    "policy": {
      "cart": {
        "maxQuantityPerItem": 99,
        "maxTotalQuantity": 500,
        "maxDistinctItems": 100,
        "allowedCurrencies": ["USD"]
      },
      "checkout": {
        "maxStoresPerCheckout": 20,
        "requireItemsInStock": true
      }
    },
    "warnings": [
      "approaching_total_quantity_limit"
    ]
  }
}
```

---

## 🧪 Testing

### Run Adapter Tests
```bash
npm test tests/services/requirementAdapterService.test.js
```

### Manual Test Cart Limits
```bash
# Set low limits for testing
export CART_MAX_TOTAL_QUANTITY=10
export CART_MAX_DISTINCT_ITEMS=5

# Try adding 11 items
# Should get ValidationError: "Cart total quantity cannot exceed 10"
```

### Test Checkout Readiness
```bash
# Add items to cart
curl -X POST http://localhost:3000/api/v1/cart/items \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storeId": 1, "productName": "Test", "productSku": "TEST", "productUrl": "http://test.com", "priceCents": 1000, "quantity": 1}'

# Check readiness
curl http://localhost:3000/api/v1/checkout/readiness \
  -H "Authorization: Bearer TOKEN"

# Example response:
# {
#   "ready": false,
#   "stores": [
#     {
#       "storeId": 1,
#       "ready": false,
#       "issues": ["not_in_app_enabled", "missing_retailer_payment_method"]
#     }
#   ]
# }
```

---

## 🐛 Common Issues & Fixes

### Issue: "Currency USD is not currently supported"
**Fix:** Add `CART_ALLOWED_CURRENCIES=USD` to `.env`

### Issue: "Cart total quantity cannot exceed X"
**Fix:** Increase `CART_MAX_TOTAL_QUANTITY` or remove items from cart

### Issue: "Store X is not allowed in cart"
**Fix:** Check `CART_BLOCKED_STORE_IDS` and `CART_ALLOWED_STORE_IDS` env vars

### Issue: "Checkout requirements not satisfied"
**Response includes:**
```json
{
  "blockers": ["out_of_stock_items_present"],
  "details": {
    "storeRules": [],
    "productTypeRules": []
  }
}
```
**Fix:** Remove out-of-stock items or change `CHECKOUT_REQUIRE_ITEMS_IN_STOCK=false`

### Issue: Checkout readiness shows "missing_retailer_payment_method"
**Cause:** `StoreAccountService.getPaymentMethodsForStores()` is not implemented yet
**Workaround:** This is expected for now - payment methods are saved during checkout flow

---

## 📚 Key Files Reference

### Services
- `src/services/cartService.js` - Cart CRUD + requirement enforcement
- `src/services/checkoutService.js` - Checkout orchestration
- `src/services/requirementAdapterService.js` - Policy enforcement

### Controllers
- `src/controllers/cartController.js` - Cart HTTP handlers
- `src/controllers/checkoutController.js` - Checkout HTTP handlers

### Routes
- `src/routes/cartRoutes.js` - Cart endpoints
- `src/routes/checkoutRoutes.js` - Checkout endpoints

### Config
- `src/config/requirementAdapters.js` - Policy defaults from env vars

### Migrations
- `migrations/013_create_cart_system.sql` - Cart items table
- `migrations/025_create_checkout_and_orders.sql` - Checkout/orders tables
- `migrations/053_add_payment_methods_to_checkout_sessions.sql` - Retailer payment methods
- `migrations/059_add_checkout_scaffolding_metadata.sql` - Checkout metadata

### Tests
- `tests/services/requirementAdapterService.test.js` - Adapter tests

---

## 🎯 Next Development Steps

### Immediate (This Sprint)
1. ✅ Migration deployed
2. ✅ Env vars configured
3. ⏳ Write unit tests for CartService
4. ⏳ Write unit tests for CheckoutService
5. ⏳ Integration test for full checkout flow

### Short-Term (Next Sprint)
1. Implement Stripe payment integration
2. Implement manual order queue
3. Add stock validation service
4. Add tax calculation service

### See Full Plan
Refer to `CART_CHECKOUT_ANALYSIS.md` Section 5 for complete implementation roadmap.

---

## 💡 Pro Tips

1. **Cart Count Optimization:** Use `GET /cart/count` for badge updates, not full cart
2. **Readiness First:** Call `/checkout/readiness` before initiating checkout to show blockers
3. **Policy Testing:** Use env vars to test different policy configurations without code changes
4. **Session Expiration:** Sessions expire in 30 minutes - store `sessionId` client-side
5. **Metadata Flexibility:** `checkout_metadata` is jsonb - extend without migrations

---

## 🆘 Need Help?

- **Full API Spec:** See `CART_CHECKOUT_ANALYSIS.md` Section 1
- **Gap Analysis:** See `CART_CHECKOUT_ANALYSIS.md` Section 3
- **Test Plan:** See `CART_CHECKOUT_ANALYSIS.md` Section 6
- **Questions:** Post in #engineering-backend Slack channel
