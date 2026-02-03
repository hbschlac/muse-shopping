# Return Experience Design - Frictionless Returns ✅

## Core Principle

**Muse makes returns EASIER than going to the retailer directly**

- Show return eligibility instantly (no guessing)
- One-click return initiation (no forms)
- Pre-filled return labels (no surveys)
- Return status tracking (in Muse)

---

## User Experience

### Scenario: Customer wants to return Nordstrom dress

```
┌─────────────────────────────────────────────────────────────┐
│  MUSE APP - Order Details                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Order #MO-ABC123                                            │
│  Placed Feb 3, 2026 via Nordstrom                            │
│  Nordstrom Order #NORD-12345678                              │
│                                                               │
│  ┌─────────────────────────────────────────────┐            │
│  │ Black Dress - Size M                        │            │
│  │ $89.00                                      │            │
│  │                                             │            │
│  │ ✅ Eligible for return                      │            │
│  │ Return window: 28 days left                 │            │
│  │                                             │            │
│  │ [Return This Item] ───────────────────────► │            │
│  └─────────────────────────────────────────────┘            │
│                                                               │
│  Delivered Feb 5, 2026                                       │
│  Tracking: 1Z999AA10123456784                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**User clicks "Return This Item"**

---

## Return Flow Option 1: API-Initiated Return (Preferred)

**If retailer supports return API:**

```
┌─────────────────────────────────────────────────────────────┐
│  Select Return Reason                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Why are you returning this item?                            │
│                                                               │
│  ○ Didn't fit                                                │
│  ○ Didn't like the style                                     │
│  ○ Wrong item received                                       │
│  ○ Damaged or defective                                      │
│  ○ Other                                                     │
│                                                               │
│  [Continue] ──────────────────────────────────────────────►  │
└─────────────────────────────────────────────────────────────┘
```

**ONE click, then:**

```
┌─────────────────────────────────────────────────────────────┐
│  Return Initiated! ✅                                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Your return has been started with Nordstrom.               │
│                                                               │
│  📦 Return Label                                             │
│  [Download QR Code]  [Email to Me]                           │
│                                                               │
│  Return by: March 3, 2026                                    │
│                                                               │
│  Return Options:                                             │
│  • Drop off at any Nordstrom store (FREE)                   │
│  • Ship via UPS (FREE - use label above)                    │
│  • Schedule UPS pickup ($5)                                  │
│                                                               │
│  Refund: $89.00 to Visa ••4242                              │
│  Estimated refund date: 5-7 days after return received       │
│                                                               │
│  Track Return Status:                                        │
│  ○ Label created                                             │
│  ○ Package shipped (pending)                                 │
│  ○ Received by Nordstrom                                     │
│  ○ Refund processed                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Total steps: 2 clicks**
- Click "Return This Item"
- Select reason → Return label generated

**NO:**
- ❌ Filling out forms
- ❌ Entering order number
- ❌ Re-entering address
- ❌ Multiple pages
- ❌ Surveys

---

## Return Flow Option 2: Deep Link to Retailer (Fallback)

**If retailer doesn't have return API:**

```
┌─────────────────────────────────────────────────────────────┐
│  Return This Item                                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  We'll take you to Nordstrom to complete your return.       │
│  Your order information will be pre-filled.                  │
│                                                               │
│  Return Details:                                             │
│  • Order #NORD-12345678                                     │
│  • Item: Black Dress - Size M                               │
│  • Refund: $89.00 to your original payment method           │
│                                                               │
│  [Continue to Nordstrom Returns] ────────────────────────►   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**User clicks "Continue to Nordstrom Returns"**

**Muse opens:**
```
https://nordstrom.com/returns?
  orderId=NORD-12345678&
  itemId=12345&
  reason=didnt_fit&
  prefill=true
```

**Nordstrom page opens with:**
- Order number already entered ✅
- Item already selected ✅
- Customer info pre-filled ✅
- Just needs to confirm → Return label generated

**Total steps: 2-3 clicks**

---

## Order Syncing - Dual Display

### Muse Order History

**Muse shows ALL orders (placed through Muse):**

```
┌─────────────────────────────────────────────────────────────┐
│  MUSE APP - Your Orders                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────┐                    │
│  │ Feb 3, 2026                         │                    │
│  │ Nordstrom Order #NORD-12345678      │                    │
│  │                                     │                    │
│  │ Black Dress - Size M          $89  │                    │
│  │ ✅ Delivered Feb 5                 │                    │
│  │                                     │                    │
│  │ [Track Package] [Return Item]      │                    │
│  │ [View in Nordstrom App] ───────►   │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
│  ┌─────────────────────────────────────┐                    │
│  │ Feb 3, 2026                         │                    │
│  │ Nordstrom Rack Order #RACK-87654   │                    │
│  │                                     │                    │
│  │ White Sneakers - Size 8       $49  │                    │
│  │ 🚚 In Transit - Arriving Feb 7     │                    │
│  │                                     │                    │
│  │ [Track Package]                    │                    │
│  └─────────────────────────────────────┘                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Nordstrom App

**Nordstrom app shows:**
- All Nordstrom orders (including ones placed via Muse)
- Order #NORD-12345678 appears in their order history
- User can also return directly from Nordstrom app

**Why this works:**
- Order placed via Nordstrom API using user's account
- Order is in Nordstrom's system (not just Muse's)
- Nordstrom app automatically shows it
- No special syncing needed

---

## Technical Implementation

### 1. Real-Time Return Eligibility

**Muse calls retailer API to check return eligibility:**

```javascript
// When user views order in Muse
const returnInfo = await nordstromAPI.getReturnEligibility(orderId);

// Returns:
{
  eligible: true,
  daysRemaining: 28,
  returnWindow: "60 days from delivery",
  returnMethods: ['in_store', 'mail', 'pickup'],
  estimatedRefund: 8900, // cents
  returnFees: 0, // Free returns
  restrictions: null
}
```

**Display in Muse:**
```jsx
{returnInfo.eligible ? (
  <Button onClick={initiateReturn}>
    Return This Item
    <Text>Return window: {returnInfo.daysRemaining} days left</Text>
  </Button>
) : (
  <Text>Return window has closed</Text>
)}
```

---

### 2. API-Based Return Initiation

```javascript
// src/services/retailerAPIs/nordstromAPI.js

async initiateReturn(orderId, items, reason) {
  const response = await this.makeRequest('POST', `/orders/${orderId}/returns`, {
    items: items.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
      reason: reason, // 'didnt_fit', 'damaged', 'wrong_item', etc.
    })),
  });

  return {
    returnId: response.returnId,
    returnNumber: response.returnNumber,

    // Return label
    returnLabel: {
      qrCode: response.returnLabel.qrCodeUrl, // QR code for in-store drop-off
      pdfUrl: response.returnLabel.pdfUrl, // Printable shipping label
      trackingNumber: response.returnLabel.trackingNumber,
    },

    // Refund info
    refund: {
      amount: response.refundAmount,
      method: response.refundMethod, // 'original_payment_method'
      estimatedDays: response.estimatedRefundDays, // 5-7 days
    },

    // Return options
    returnOptions: [
      {
        type: 'in_store',
        description: 'Drop off at any Nordstrom store',
        cost: 0,
        instructions: 'Show QR code to associate',
      },
      {
        type: 'ship',
        description: 'Ship via UPS',
        cost: 0,
        instructions: 'Print label and drop at UPS',
      },
      {
        type: 'pickup',
        description: 'Schedule UPS pickup',
        cost: 500, // $5
        instructions: 'UPS will pick up from your door',
      },
    ],

    // Deadlines
    returnBy: response.returnByDate,
    shipBy: response.shipByDate,
  };
}
```

---

### 3. Return Status Tracking

**Muse syncs return status from retailer:**

```javascript
// Periodic sync (every 6 hours)
async syncReturnStatus(returnId) {
  const status = await nordstromAPI.getReturnStatus(returnId);

  await pool.query(
    `UPDATE returns
     SET status = $1,
         tracking_number = $2,
         refund_status = $3,
         refund_amount = $4,
         refunded_at = $5
     WHERE return_id = $6`,
    [
      status.returnStatus, // 'label_created', 'shipped', 'received', 'refunded'
      status.trackingNumber,
      status.refundStatus,
      status.refundAmount,
      status.refundedAt,
      returnId,
    ]
  );
}
```

**Display in Muse:**
```jsx
<ReturnTimeline>
  <Step completed>✅ Return initiated</Step>
  <Step completed>✅ Label created</Step>
  <Step active>📦 Waiting for package</Step>
  <Step>Received by Nordstrom</Step>
  <Step>Refund processed</Step>
</ReturnTimeline>
```

---

### 4. Database Schema

```sql
-- Add returns table
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  order_id INT NOT NULL REFERENCES orders(id),
  store_id INT NOT NULL REFERENCES stores(id),

  -- Return identification
  return_id VARCHAR(255) NOT NULL, -- Muse return ID
  retailer_return_id VARCHAR(255), -- Nordstrom's return ID
  retailer_return_number VARCHAR(255), -- Display to user

  -- Return details
  return_reason VARCHAR(100),
  return_method VARCHAR(50), -- 'in_store', 'ship', 'pickup'

  -- Return label
  return_label_url TEXT,
  return_label_qr_code_url TEXT,
  tracking_number VARCHAR(255),

  -- Status
  status VARCHAR(50) DEFAULT 'initiated',
  -- 'initiated', 'label_created', 'shipped', 'received', 'approved', 'refunded', 'rejected'

  -- Refund
  refund_amount_cents INT,
  refund_status VARCHAR(50), -- 'pending', 'processing', 'completed'
  refund_method VARCHAR(50), -- 'original_payment_method'
  refunded_at TIMESTAMP,

  -- Deadlines
  return_by_date DATE,
  ship_by_date DATE,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_returns_user ON returns(user_id);
CREATE INDEX idx_returns_order ON returns(order_id);
CREATE INDEX idx_returns_status ON returns(status);

-- Add to order_items table
ALTER TABLE order_items ADD COLUMN return_id INT REFERENCES returns(id);
ALTER TABLE order_items ADD COLUMN item_status VARCHAR(50) DEFAULT 'ordered';
-- 'ordered', 'delivered', 'return_initiated', 'returned', 'refunded'
```

---

## Return Service Implementation

```javascript
// src/services/returnService.js

class ReturnService {
  /**
   * Check if item is eligible for return
   * @param {number} orderId - Order ID
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} Eligibility info
   */
  static async checkReturnEligibility(orderId, itemId) {
    // Get order
    const order = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );

    // Get OAuth connection
    const connection = await StoreConnectionService.getConnection(
      order.user_id,
      order.store_id
    );

    // Get API client
    const apiClient = RetailerAPIFactory.getClient(order.store_id, {
      accessToken: await StoreConnectionService.getAccessToken(
        order.user_id,
        order.store_id
      ),
    });

    // Check with retailer
    const eligibility = await apiClient.getReturnEligibility(
      order.store_order_number,
      itemId
    );

    return eligibility;
  }

  /**
   * Initiate return with retailer
   * @param {number} orderId - Order ID
   * @param {Array} items - Items to return
   * @param {string} reason - Return reason
   * @returns {Promise<Object>} Return details
   */
  static async initiateReturn(orderId, items, reason) {
    // Get order
    const orderResult = await pool.query(
      `SELECT * FROM orders WHERE id = $1`,
      [orderId]
    );
    const order = orderResult.rows[0];

    // Get API client
    const apiClient = RetailerAPIFactory.getClient(order.store_id, {
      accessToken: await StoreConnectionService.getAccessToken(
        order.user_id,
        order.store_id
      ),
    });

    // Initiate return with retailer
    const returnResult = await apiClient.initiateReturn(
      order.store_order_number,
      items,
      reason
    );

    // Save return record
    const returnId = `MR-${nanoid(10)}`;

    const result = await pool.query(
      `INSERT INTO returns (
        return_id,
        user_id,
        order_id,
        store_id,
        retailer_return_id,
        retailer_return_number,
        return_reason,
        return_label_url,
        return_label_qr_code_url,
        tracking_number,
        status,
        refund_amount_cents,
        return_by_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        returnId,
        order.user_id,
        order.id,
        order.store_id,
        returnResult.returnId,
        returnResult.returnNumber,
        reason,
        returnResult.returnLabel.pdfUrl,
        returnResult.returnLabel.qrCode,
        returnResult.returnLabel.trackingNumber,
        'label_created',
        returnResult.refund.amount,
        returnResult.returnBy,
      ]
    );

    // Update order items status
    for (const item of items) {
      await pool.query(
        `UPDATE order_items
         SET return_id = $1,
             item_status = 'return_initiated'
         WHERE id = $2`,
        [result.rows[0].id, item.itemId]
      );
    }

    logger.info(`Return initiated: ${returnId} for order ${order.muse_order_number}`);

    return {
      returnId: returnId,
      returnNumber: returnResult.returnNumber,
      returnLabel: returnResult.returnLabel,
      refund: returnResult.refund,
      returnOptions: returnResult.returnOptions,
    };
  }

  /**
   * Get return status
   * @param {string} returnId - Return ID
   * @returns {Promise<Object>} Return status
   */
  static async getReturnStatus(returnId) {
    const result = await pool.query(
      `SELECT r.*, o.store_id, o.muse_order_number
       FROM returns r
       JOIN orders o ON r.order_id = o.id
       WHERE r.return_id = $1`,
      [returnId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Return not found');
    }

    return result.rows[0];
  }

  /**
   * Sync return status from retailer
   * @param {string} returnId - Return ID
   * @returns {Promise<void>}
   */
  static async syncReturnStatus(returnId) {
    const returnRecord = await this.getReturnStatus(returnId);

    // Get API client
    const apiClient = RetailerAPIFactory.getClient(returnRecord.store_id, {
      accessToken: await StoreConnectionService.getAccessToken(
        returnRecord.user_id,
        returnRecord.store_id
      ),
    });

    // Get status from retailer
    const status = await apiClient.getReturnStatus(returnRecord.retailer_return_id);

    // Update our record
    await pool.query(
      `UPDATE returns
       SET status = $1,
           refund_status = $2,
           refunded_at = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE return_id = $4`,
      [status.returnStatus, status.refundStatus, status.refundedAt, returnId]
    );
  }
}
```

---

## API Endpoints

```
# Check return eligibility
GET /api/v1/orders/:orderNumber/items/:itemId/return-eligibility
→ Returns eligibility info

# Initiate return
POST /api/v1/orders/:orderNumber/returns
Body: {
  items: [{ itemId, quantity }],
  reason: "didnt_fit"
}
→ Returns return label, refund info

# Get return status
GET /api/v1/returns/:returnId
→ Returns current status

# Get user's returns
GET /api/v1/returns
→ All user's returns with status

# Download return label
GET /api/v1/returns/:returnId/label
→ PDF download
```

---

## User Experience Comparison

### Without Muse (Traditional)
```
1. Open Nordstrom app
2. Find orders
3. Find the specific order (scroll through list)
4. Click on order
5. Click "Return Item"
6. Select item
7. Select return reason
8. Enter return details
9. Confirm address
10. Generate label
11. Download/email label

Total: 11 steps, ~3 minutes
```

### With Muse ✅
```
1. Open Muse app → Orders (auto-shows recent orders)
2. Click on order (already visible)
3. Click "Return This Item"
4. Select reason
5. Return label generated

Total: 5 steps, ~30 seconds
```

**60% fewer steps, 6x faster**

---

## Key Features

✅ **Instant Eligibility Check**
- No guessing if you can return
- Shows days remaining
- Shows return options

✅ **One-Click Return**
- Pre-filled with order info
- No forms to fill out
- Return label generated instantly

✅ **Multiple Return Options**
- In-store drop-off (QR code)
- Ship via UPS (printable label)
- Schedule pickup

✅ **Real-Time Status**
- Track return progress
- See refund status
- Estimated refund date

✅ **Dual Visibility**
- Order shows in Muse
- Order shows in Nordstrom app
- Can return from either place

---

## Summary

**Muse makes returns EASIER than going to the retailer:**

1. **Faster** - 60% fewer steps
2. **Simpler** - No forms, everything pre-filled
3. **Transparent** - Clear eligibility, refund info
4. **Flexible** - Multiple return methods
5. **Tracked** - Real-time status updates

**Technical approach:**
- OAuth gives access to return APIs
- Return eligibility checked via API
- Return initiated via API (not redirect)
- Status synced periodically
- Return shows in both Muse and retailer app

**Customer wins:**
- Sees order in both apps
- Returns from whichever is easier
- Gets refund to original payment method
- Statement shows retailer name (not Muse)

This is the frictionless return experience customers expect! 🎉
