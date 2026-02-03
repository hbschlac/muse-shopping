# 🚀 Experimentation System - Quick Start Guide

## TL;DR

You now have a complete A/B testing + multi-armed bandit system. Here's how to use it in 5 minutes:

---

## 1. Run Migration (One Time Setup)

```bash
cd /Users/hannahschlacter/Desktop/muse-shopping

psql -h localhost -p 5432 -U muse_admin -d muse_shopping_dev \
  -f migrations/019_create_experimentation_system.sql
```

---

## 2. Create Your First Experiment (2 minutes)

### Option A: Test Item Ordering with Thompson Sampling (Recommended)

```bash
# Step 1: Create experiment
curl -X POST http://localhost:3000/api/v1/admin/experiments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Item Ordering Optimization",
    "description": "Use Thompson Sampling to optimize item order",
    "experimentType": "bandit",
    "target": "item_ordering",
    "trafficAllocation": 100,
    "primaryMetric": "add_to_cart_rate"
  }'

# Step 2: Add control variant (current ordering)
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/variants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "control",
    "isControl": true,
    "trafficWeight": 1,
    "config": { "itemOrdering": "relevance_score" }
  }'

# Step 3: Add bandit variant (Thompson Sampling)
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/variants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "thompson_sampling",
    "trafficWeight": 1,
    "config": {
      "itemOrdering": "bandit",
      "banditAlgorithm": "thompson"
    }
  }'

# Step 4: Start experiment
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option B: Simple A/B Test (Recommendation Algorithm)

```bash
# Create experiment
curl -X POST http://localhost:3000/api/v1/admin/experiments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Email vs Instagram Weight Test",
    "experimentType": "ab_test",
    "target": "newsfeed",
    "trafficAllocation": 100,
    "primaryMetric": "add_to_cart_rate"
  }'

# Add variants
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/variants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "control_60_40",
    "isControl": true,
    "trafficWeight": 1,
    "config": { "emailWeight": 0.6, "instagramWeight": 0.4 }
  }'

curl -X POST http://localhost:3000/api/v1/admin/experiments/1/variants \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "treatment_50_50",
    "trafficWeight": 1,
    "config": { "emailWeight": 0.5, "instagramWeight": 0.5 }
  }'

# Start
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. Test Assignment (30 seconds)

```bash
# Test with user_id
curl -X POST http://localhost:3000/api/v1/experiments/assign \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "session_id": "session_456",
    "context": {
      "page_type": "feed",
      "placement": "newsfeed"
    }
  }'

# Response:
# {
#   "experiment_id": "Item Ordering Optimization",
#   "variant": "thompson_sampling",
#   "params": {
#     "itemOrdering": "bandit",
#     "banditAlgorithm": "thompson"
#   }
# }
```

---

## 4. Track Events (30 seconds)

```bash
# Track when user adds item to cart (PRIMARY METRIC)
curl -X POST http://localhost:3000/api/v1/experiments/track-add-to-cart \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "session_id": "session_456",
    "experiment_id": 1,
    "variant_id": 2,
    "item_id": 1234,
    "position": 3,
    "value": 8500
  }'

# Track click
curl -X POST http://localhost:3000/api/v1/experiments/track-click \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "experiment_id": 1,
    "variant_id": 2,
    "item_id": 1234,
    "position": 3
  }'
```

---

## 5. View Results (1 minute)

```bash
# Complete experiment report
curl http://localhost:3000/api/v1/admin/experiments/1/report \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# Get lift vs control
curl http://localhost:3000/api/v1/admin/experiments/1/lift \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# Position analysis (which positions perform best?)
curl http://localhost:3000/api/v1/admin/experiments/1/position-analysis \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# Bandit arm performance (which items performing best?)
curl "http://localhost:3000/api/v1/admin/experiments/1/bandit-arms?armType=item" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .

# Top items
curl http://localhost:3000/api/v1/admin/experiments/1/top-items \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .
```

---

## 6. Declare Winner (when ready)

```bash
# After experiment runs for sufficient time and you have statistical significance
curl -X POST http://localhost:3000/api/v1/admin/experiments/1/declare-winner \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "winnerVariantId": 2,
    "significance": 95.8
  }'
```

---

## Real-World Example Flow

### Scenario: Optimize Newsfeed Item Order

**Day 1:** Create experiment, start Thompson Sampling
```bash
# 1. Create + add variants + start (see Option A above)
# Done! Experiment is live.
```

**Day 2-7:** System automatically learns
- Users see newsfeed
- Thompson Sampling optimizes order
- High-converting items move up
- Low-converting items move down
- New items get explored

**Day 8:** Check results
```bash
curl http://localhost:3000/api/v1/admin/experiments/1/bandit-arms?armType=item \
  -H "Authorization: Bearer YOUR_TOKEN"

# See which items are winning:
# Item 1234 (Reformation Dress): 18% add-to-cart rate, shown 1,200 times
# Item 5678 (Ganni Top): 16% add-to-cart rate, shown 950 times
# Item 9012 (Zara Blazer): 4% add-to-cart rate, shown 45 times (learned it's bad)
```

**Result:** +22% add-to-cart rate vs static ordering! 🎉

---

## Frontend Integration

### React Example

```javascript
import { useEffect, useState } from 'react';

function NewsfeedPage({ userId, sessionId }) {
  const [experiment, setExperiment] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Get experiment assignment
    fetch('/api/v1/experiments/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        context: {
          page_type: 'feed',
          placement: 'newsfeed'
        }
      })
    })
      .then(res => res.json())
      .then(data => {
        setExperiment(data);

        // Fetch items (backend will auto-apply experiment)
        return fetch('/api/v1/newsfeed');
      })
      .then(res => res.json())
      .then(data => setItems(data.items));
  }, [userId, sessionId]);

  const handleItemClick = (item, position) => {
    // Track click
    fetch('/api/v1/experiments/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        experiment_id: experiment?.experiment_id,
        variant_id: experiment?.variant_id,
        item_id: item.id,
        position: position + 1
      })
    });
  };

  const handleAddToCart = (item, position) => {
    // Track add-to-cart (primary metric!)
    fetch('/api/v1/experiments/track-add-to-cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        experiment_id: experiment?.experiment_id,
        variant_id: experiment?.variant_id,
        item_id: item.id,
        position: position + 1,
        value: item.price_cents
      })
    });

    // Add to cart logic...
  };

  return (
    <div>
      {items.map((item, index) => (
        <ItemCard
          key={item.id}
          item={item}
          position={index}
          onClick={() => handleItemClick(item, index)}
          onAddToCart={() => handleAddToCart(item, index)}
        />
      ))}
    </div>
  );
}
```

---

## Common Experiment Types

### 1. Item Ordering

```json
{
  "name": "Item Order Optimization",
  "experimentType": "bandit",
  "target": "item_ordering",
  "config": {
    "itemOrdering": "bandit",
    "banditAlgorithm": "thompson"
  }
}
```

**Use when:** Want to find optimal item order
**Algorithm:** Thompson Sampling
**Metric:** Add-to-cart rate

### 2. Algorithm Version

```json
{
  "name": "Rec Algorithm v2 vs v3",
  "experimentType": "ab_test",
  "target": "newsfeed",
  "variants": [
    { "name": "control", "config": { "algorithm": "v2" } },
    { "name": "treatment", "config": { "algorithm": "v3" } }
  ]
}
```

**Use when:** Testing new recommendation algorithm
**Type:** A/B test
**Metric:** Add-to-cart rate, CTR

### 3. Feature Weights

```json
{
  "name": "Email vs Instagram Weight",
  "experimentType": "multivariate",
  "variants": [
    { "config": { "emailWeight": 0.6, "instagramWeight": 0.4 } },
    { "config": { "emailWeight": 0.5, "instagramWeight": 0.5 } },
    { "config": { "emailWeight": 0.4, "instagramWeight": 0.6 } }
  ]
}
```

**Use when:** Tuning feature weights
**Type:** Multivariate test
**Metric:** Add-to-cart rate

### 4. Brand Ranking

```json
{
  "name": "Brand Ranking Optimization",
  "experimentType": "bandit",
  "target": "brand_ranking",
  "config": {
    "banditAlgorithm": "ucb",
    "banditOptions": { "c": 1.41 }
  }
}
```

**Use when:** Optimizing brand order
**Algorithm:** UCB (good for revenue optimization)
**Metric:** Revenue per session

---

## Troubleshooting

### Experiment not assigning users?

**Check:**
1. Is experiment status = 'running'?
   ```bash
   curl http://localhost:3000/api/v1/admin/experiments/1 -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. Does experiment have variants?
   ```bash
   curl http://localhost:3000/api/v1/admin/experiments/1/variants -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. Is traffic allocation > 0?

### Not seeing results?

**Check:**
1. Are events being tracked?
   ```sql
   SELECT COUNT(*) FROM experiment_events WHERE experiment_id = 1;
   ```

2. Do you have enough data? (Need 100+ events per variant)

3. Waited long enough? (Minimum 1 week recommended)

### Thompson Sampling not working?

**Check:**
1. Are bandit arms created?
   ```sql
   SELECT COUNT(*) FROM bandit_arms WHERE experiment_id = 1;
   ```

2. Are arms being updated?
   ```sql
   SELECT * FROM bandit_arms WHERE total_pulls > 0 ORDER BY average_reward DESC;
   ```

---

## Next Steps

1. ✅ **Start with Thompson Sampling** on item ordering
2. ⏱️ **Run for 1-2 weeks** to collect data
3. 📊 **Analyze results** using report endpoint
4. 🏆 **Declare winner** when statistically significant
5. 🔄 **Create next experiment** to continue optimizing

---

## Questions?

- **Full docs:** `EXPERIMENTATION_SYSTEM_COMPLETE.md`
- **CODEX specs:** `/Users/hannahschlacter/Documents/Muse Shopping/Experiment_Service_*.md`
- **Database schema:** `migrations/019_create_experimentation_system.sql`

---

**You're ready to start optimizing! 🚀**
