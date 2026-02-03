# Example: Module Order Experiment for 20 Users

## Scenario
Test different module orders on a sample set of 20 users to see which order drives more add-to-carts.

---

## Step 1: Create Experiment

```bash
curl -X POST http://localhost:3000/api/v1/admin/experiments \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Module Order Test - 20 Users",
    "description": "Test optimal module order on sample user set",
    "experimentType": "ab_test",
    "target": "newsfeed",
    "trafficAllocation": 100,
    "primaryMetric": "add_to_cart_rate",
    "secondaryMetrics": ["click_through_rate"]
  }'
```

---

## Step 2: Add Variants

### Variant A (Control): Original Order
```bash
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/variants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "control_original_order",
    "isControl": true,
    "trafficWeight": 1,
    "config": {
      "moduleOrdering": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      "description": "Original module order - Sale first, New Arrivals second"
    }
  }'
```

### Variant B (Treatment): New Arrivals First
```bash
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/variants \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "treatment_new_arrivals_first",
    "trafficWeight": 1,
    "config": {
      "moduleOrdering": [2, 1, 3, 4, 5, 6, 7, 8, 9, 10],
      "description": "New Arrivals first, Sale second"
    }
  }'
```

---

## Step 3: Start Experiment

```bash
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/start \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Step 4: Users Get Assigned Automatically

When your 20 test users visit the newsfeed:

```javascript
// In your newsfeed endpoint, the middleware automatically:
// 1. Detects active experiment
// 2. Assigns user to variant (deterministic - user_123 always gets same variant)
// 3. Applies variant config to response

// User 1 visits
GET /api/v1/newsfeed
→ Assigned to "control" → sees modules in order [1,2,3,4,5...]

// User 2 visits
GET /api/v1/newsfeed
→ Assigned to "treatment" → sees modules in order [2,1,3,4,5...]

// User 1 visits again
GET /api/v1/newsfeed
→ Still sees "control" (sticky assignment)
```

---

## Step 5: Track Which Users Are in Which Variant

```sql
-- See all 20 users and their assignments
SELECT
  uea.user_id,
  u.email,
  ev.name as variant_name,
  ev.config->>'moduleOrdering' as module_order,
  uea.assigned_at
FROM user_experiment_assignments uea
JOIN users u ON uea.user_id = u.id
JOIN experiment_variants ev ON uea.variant_id = ev.id
WHERE uea.experiment_id = 1
ORDER BY uea.user_id;
```

**Example Output:**
```
user_id | email              | variant_name                 | module_order
--------|--------------------|-----------------------------|------------------
1       | alice@example.com  | control_original_order      | [1,2,3,4,5...]
2       | bob@example.com    | treatment_new_arrivals_first| [2,1,3,4,5...]
3       | carol@example.com  | control_original_order      | [1,2,3,4,5...]
...
```

---

## Step 6: See Results After Users Interact

```bash
# Get experiment report
curl http://localhost:3000/api/v1/admin/experiments/1/report \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Results:**
```json
{
  "metrics": [
    {
      "variant_name": "control_original_order",
      "impressions": 150,
      "clicks": 45,
      "add_to_carts": 12,
      "click_through_rate": 30.0,
      "add_to_cart_rate": 8.0,
      "unique_users": 10
    },
    {
      "variant_name": "treatment_new_arrivals_first",
      "impressions": 145,
      "clicks": 52,
      "add_to_carts": 18,
      "click_through_rate": 35.9,
      "add_to_cart_rate": 12.4,
      "unique_users": 10
    }
  ],
  "lift": [
    {
      "variant_name": "treatment_new_arrivals_first",
      "metric": "add_to_cart_rate",
      "control_value": 8.0,
      "variant_value": 12.4,
      "absolute_lift": 4.4,
      "relative_lift_percent": 55.0
    }
  ]
}
```

**Insight:** New Arrivals first = **+55% add-to-cart rate!** 🎉

---

## Step 7: Drill Down by Position

```bash
# Which module positions perform best?
curl http://localhost:3000/api/v1/admin/experiments/1/position-analysis \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Example Output:**
```json
{
  "positions": [
    {
      "position": 1,
      "impressions": 295,
      "clicks": 105,
      "add_to_carts": 30,
      "ctr": 35.6,
      "add_to_cart_rate": 28.6
    },
    {
      "position": 2,
      "impressions": 280,
      "clicks": 75,
      "add_to_carts": 18,
      "ctr": 26.8,
      "add_to_cart_rate": 24.0
    }
  ]
}
```

**Insight:** Position 1 gets 35.6% CTR vs position 2's 26.8% → **Position matters!**

---

## Alternative: Test Multiple Module Orders

Instead of just 2 variants, test 4 different orders:

```bash
# Variant A: Original [1,2,3,4,5]
# Variant B: Reverse [5,4,3,2,1]
# Variant C: High-performing first [3,1,5,2,4]
# Variant D: Random shuffle [2,5,1,4,3]

# With 20 users:
# ~5 users per variant (deterministic hash distribution)
```

---

## What Gets Tracked Automatically

**For each user interaction:**
- ✅ Which module they saw
- ✅ Which position it was in
- ✅ Whether they clicked
- ✅ Whether they added to cart
- ✅ Which variant they were in
- ✅ Timestamp

**Analytics show:**
- Which variant has higher add-to-cart rate
- Which module positions perform best
- Which specific modules drive conversions
- Statistical significance of results

---

## SQL to See Everything

```sql
-- See all events for the experiment
SELECT
  ee.user_id,
  ev.name as variant,
  ee.event_type,
  ee.module_id,
  ee.position,
  ee.created_at
FROM experiment_events ee
JOIN experiment_variants ev ON ee.variant_id = ev.id
WHERE ee.experiment_id = 1
ORDER BY ee.user_id, ee.created_at;
```

---

## Next Steps

1. **Run the test script** to verify everything works
2. **Create your module order experiment** with the actual module IDs you want to test
3. **Invite 20 test users** to use the newsfeed
4. **Monitor results** in real-time via the admin endpoints
5. **Declare winner** when you have enough data

You can change module order, brand order, item order, or any other ordering you want to test!
