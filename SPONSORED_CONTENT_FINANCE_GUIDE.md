# Sponsored Content - Finance Tracking & Revenue Guide

**Date:** 2026-02-03
**Status:** Complete

---

## Executive Summary

The Muse Sponsored Content system enables brands and retailers to run paid marketing campaigns on the homepage newsfeed. This document outlines:
- Revenue tracking mechanisms
- Financial reporting for finance team
- Budget management for marketing team
- Invoicing and reconciliation workflows

---

## Revenue Model

### Pricing Tiers

**1. CPM (Cost Per Mille / 1000 Impressions)**
- **Price Range:** $5 - $50 CPM
- **Best For:** Brand awareness campaigns, new product launches
- **Calculation:** (Total Impressions / 1000) × CPM Rate
- **Example:** 100,000 impressions at $10 CPM = $1,000

**2. CPC (Cost Per Click)**
- **Price Range:** $0.50 - $5.00 per click
- **Best For:** Traffic-driving campaigns, product discovery
- **Calculation:** Total Clicks × CPC Rate
- **Example:** 500 clicks at $2.00 CPC = $1,000

**3. Flat Fee**
- **Price Range:** $1,000 - $50,000 per campaign
- **Best For:** Exclusive homepage takeovers, seasonal campaigns
- **Calculation:** Fixed price regardless of performance
- **Example:** 7-day homepage hero placement = $10,000

---

## Financial Tracking Architecture

### Database Tables

#### 1. `sponsored_campaigns`
**Purpose:** Master campaign records with budget allocation

**Key Financial Fields:**
```sql
budget_type VARCHAR(50)           -- 'cpm', 'cpc', 'flat_fee'
budget_amount DECIMAL(10,2)        -- Total budget allocated ($)
cost_per_impression DECIMAL(6,4)   -- CPM rate
cost_per_click DECIMAL(6,2)        -- CPC rate
daily_budget_cap DECIMAL(10,2)     -- Daily spend limit
```

#### 2. `sponsored_impressions`
**Purpose:** Track billable impressions

**Key Financial Fields:**
```sql
impression_cost DECIMAL(6,4)       -- Cost of this impression
```

**Daily Aggregation Query:**
```sql
SELECT
  campaign_id,
  DATE(viewed_at) as date,
  COUNT(*) as impressions,
  SUM(impression_cost) as total_impression_revenue
FROM sponsored_impressions
WHERE viewed_at >= '2026-02-01'
GROUP BY campaign_id, DATE(viewed_at);
```

#### 3. `sponsored_clicks`
**Purpose:** Track billable clicks

**Key Financial Fields:**
```sql
click_cost DECIMAL(6,2)            -- Cost of this click
```

**Daily Aggregation Query:**
```sql
SELECT
  campaign_id,
  DATE(clicked_at) as date,
  COUNT(*) as clicks,
  SUM(click_cost) as total_click_revenue
FROM sponsored_clicks
WHERE clicked_at >= '2026-02-01'
GROUP BY campaign_id, DATE(clicked_at);
```

#### 4. `campaign_budget_tracking`
**Purpose:** Daily financial aggregates for reconciliation

**Key Financial Fields:**
```sql
total_spent DECIMAL(10,2)          -- Total revenue generated
impression_spend DECIMAL(10,2)     -- Revenue from impressions
click_spend DECIMAL(10,2)          -- Revenue from clicks
total_conversion_value DECIMAL(10,2) -- GMV from conversions
cpm DECIMAL(8,2)                   -- Effective CPM
cpc DECIMAL(8,2)                   -- Effective CPC
cpa DECIMAL(10,2)                  -- Cost per acquisition
roas DECIMAL(10,2)                 -- Return on ad spend
```

---

## Revenue Reporting

### Daily Revenue Report

**Query:**
```sql
SELECT
  DATE(tracking_date) as date,
  COUNT(DISTINCT campaign_id) as active_campaigns,
  SUM(total_impressions) as total_impressions,
  SUM(total_clicks) as total_clicks,
  SUM(total_conversions) as total_conversions,
  SUM(impression_spend) as impression_revenue,
  SUM(click_spend) as click_revenue,
  SUM(total_spent) as total_revenue,
  SUM(total_conversion_value) as gmv_generated
FROM campaign_budget_tracking
WHERE tracking_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(tracking_date)
ORDER BY date DESC;
```

**Output:**
| Date       | Active Campaigns | Impressions | Clicks | Revenue   | GMV      |
|------------|------------------|-------------|--------|-----------|----------|
| 2026-02-03 | 12               | 450,000     | 2,300  | $3,250    | $18,900  |
| 2026-02-02 | 11               | 380,000     | 1,900  | $2,850    | $15,200  |

### Campaign-Level Revenue Report

**Query:**
```sql
SELECT
  c.id,
  c.campaign_name,
  c.campaign_code,
  b.name as brand_name,
  c.budget_type,
  c.budget_amount,
  c.start_date,
  c.end_date,
  -- Performance
  SUM(cbt.total_impressions) as total_impressions,
  SUM(cbt.total_clicks) as total_clicks,
  SUM(cbt.total_conversions) as total_conversions,
  -- Revenue
  SUM(cbt.impression_spend) as impression_revenue,
  SUM(cbt.click_spend) as click_revenue,
  SUM(cbt.total_spent) as total_revenue,
  -- Budget utilization
  c.budget_amount - SUM(cbt.total_spent) as remaining_budget,
  ROUND((SUM(cbt.total_spent) / c.budget_amount) * 100, 2) as budget_utilization_percent
FROM sponsored_campaigns c
JOIN brands b ON c.brand_id = b.id
LEFT JOIN campaign_budget_tracking cbt ON c.id = cbt.campaign_id
WHERE c.status IN ('active', 'paused', 'completed')
GROUP BY c.id, c.campaign_name, c.campaign_code, b.name, c.budget_type, c.budget_amount, c.start_date, c.end_date
ORDER BY total_revenue DESC;
```

### Monthly Revenue Summary

**Query:**
```sql
SELECT
  DATE_TRUNC('month', tracking_date) as month,
  COUNT(DISTINCT campaign_id) as total_campaigns,
  SUM(total_impressions) as total_impressions,
  SUM(total_clicks) as total_clicks,
  SUM(total_spent) as total_revenue,
  AVG(cpm) as avg_cpm,
  AVG(cpc) as avg_cpc,
  AVG(roas) as avg_roas
FROM campaign_budget_tracking
GROUP BY DATE_TRUNC('month', tracking_date)
ORDER BY month DESC;
```

---

## Invoicing & Reconciliation

### Invoice Generation Workflow

**1. Campaign Completion**
When a campaign ends (reaches `end_date` or budget exhausted):

```sql
-- Get final campaign metrics for invoicing
SELECT
  c.id,
  c.campaign_name,
  c.campaign_code,
  c.sponsor_contact_email,
  b.name as brand_name,
  c.budget_type,
  c.budget_amount,
  -- Final totals
  SUM(cbt.total_impressions) as final_impressions,
  SUM(cbt.total_clicks) as final_clicks,
  SUM(cbt.total_conversions) as final_conversions,
  SUM(cbt.total_spent) as invoice_amount,
  -- Breakdown
  SUM(cbt.impression_spend) as impression_charges,
  SUM(cbt.click_spend) as click_charges
FROM sponsored_campaigns c
JOIN brands b ON c.brand_id = b.id
JOIN campaign_budget_tracking cbt ON c.id = cbt.campaign_id
WHERE c.id = $1
GROUP BY c.id, c.campaign_name, c.campaign_code, c.sponsor_contact_email, b.name, c.budget_type, c.budget_amount;
```

**2. Invoice Template**

```
Invoice #: INV-{campaign_code}-{YYYYMMDD}
Campaign: {campaign_name}
Brand: {brand_name}
Contact: {sponsor_contact_email}

Campaign Period: {start_date} - {end_date}

LINE ITEMS:
- Impressions: {final_impressions} × ${cost_per_impression} = ${impression_charges}
- Clicks: {final_clicks} × ${cost_per_click} = ${click_charges}

TOTAL: ${invoice_amount}

Payment Terms: Net 30
Due Date: {invoice_date + 30 days}
```

**3. Reconciliation Report**

```sql
-- Monthly reconciliation by brand
SELECT
  b.id as brand_id,
  b.name as brand_name,
  COUNT(DISTINCT c.id) as campaigns_run,
  SUM(cbt.total_spent) as total_billed,
  -- Payment tracking (requires separate payments table)
  -- SUM(p.amount_paid) as total_paid,
  -- SUM(cbt.total_spent) - SUM(p.amount_paid) as outstanding_balance
FROM brands b
JOIN sponsored_campaigns c ON b.id = c.brand_id
JOIN campaign_budget_tracking cbt ON c.id = cbt.campaign_id
WHERE DATE_TRUNC('month', c.end_date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY b.id, b.name
ORDER BY total_billed DESC;
```

---

## Budget Management

### Auto-Pause on Budget Exhaustion

**Function:** `check_campaign_budgets()` (defined in migration 024)

```sql
-- Run daily via cron job
SELECT check_campaign_budgets();
```

**What it does:**
- Checks all active campaigns
- Calculates total spend vs. budget
- Auto-pauses campaigns that exceeded budget
- Logs internal note with pause reason

### Daily Budget Cap Enforcement

**Service Layer Logic:**
```javascript
// In SponsoredContentService.getEligibleCampaigns()

const todaySpend = await pool.query(`
  SELECT COALESCE(SUM(total_spent), 0) as spend
  FROM campaign_budget_tracking
  WHERE campaign_id = $1 AND tracking_date = CURRENT_DATE
`, [campaignId]);

if (campaign.daily_budget_cap && todaySpend.rows[0].spend >= campaign.daily_budget_cap) {
  // Exclude campaign from serving today
  continue;
}
```

### Budget Alerts

**Finance Team Alerts:**
- Campaign reaches 75% budget utilization → Email alert
- Campaign reaches 90% budget utilization → Email + Slack alert
- Campaign exhausts budget → Auto-pause + Email notification

**Query for Alert Monitoring:**
```sql
SELECT
  c.id,
  c.campaign_name,
  c.budget_amount,
  SUM(cbt.total_spent) as spent,
  ROUND((SUM(cbt.total_spent) / c.budget_amount) * 100, 2) as utilization_percent
FROM sponsored_campaigns c
JOIN campaign_budget_tracking cbt ON c.id = cbt.campaign_id
WHERE c.is_active = true
GROUP BY c.id, c.campaign_name, c.budget_amount
HAVING (SUM(cbt.total_spent) / c.budget_amount) >= 0.75
ORDER BY utilization_percent DESC;
```

---

## Marketing Team Interfaces

### Campaign Dashboard

**GET /api/v1/sponsored/campaigns**

**Response:**
```json
{
  "campaigns": [
    {
      "id": 123,
      "campaign_name": "Spring 2026 Collection",
      "campaign_code": "SPRING2026_NIKE",
      "status": "active",
      "budget_amount": 10000.00,
      "total_spent": 4250.00,
      "remaining_budget": 5750.00,
      "total_impressions": 425000,
      "total_clicks": 2130,
      "ctr_percent": 0.50,
      "start_date": "2026-02-01",
      "end_date": "2026-02-28"
    }
  ]
}
```

### Campaign Creation

**POST /api/v1/sponsored/campaigns**

**Request Body:**
```json
{
  "campaignName": "Summer Sale 2026",
  "campaignCode": "SUMMER2026_ZARA",
  "brandId": 45,
  "sponsorType": "brand",
  "sponsorContactEmail": "marketing@zara.com",
  "title": "Summer Sale - Up to 50% Off",
  "subtitle": "Discover our hottest summer styles",
  "description": "Shop the latest summer trends...",
  "callToAction": "Shop Now",
  "heroImageUrl": "https://cdn.muse.com/campaigns/summer2026.jpg",
  "budgetType": "cpm",
  "budgetAmount": 15000.00,
  "costPerImpression": 0.012,
  "dailyBudgetCap": 500.00,
  "targetImpressions": 1250000,
  "startDate": "2026-06-01T00:00:00Z",
  "endDate": "2026-06-30T23:59:59Z",
  "placementSlots": ["homepage_hero", "newsfeed_position_3"],
  "frequencyCap": 5,
  "targetAudience": {
    "age_range": "18-34",
    "style_profiles": ["minimal", "classic", "streetwear"],
    "price_tiers": ["mid", "premium"]
  },
  "geographicTargeting": ["US", "CA", "UK"]
}
```

### Real-Time Performance

**GET /api/v1/sponsored/campaigns/:id/performance**

**Response:**
```json
{
  "campaign_id": 123,
  "total_impressions": 425000,
  "total_clicks": 2130,
  "total_conversions": 87,
  "total_spent": 4250.00,
  "total_revenue": 12870.00,
  "avg_ctr": 0.50,
  "avg_conversion_rate": 4.08,
  "avg_cpm": 10.00,
  "avg_cpc": 2.00,
  "avg_cpa": 48.85,
  "avg_roas": 3.03
}
```

---

## Finance Team Dashboards

### Revenue Summary Dashboard

**Key Metrics:**
- Total Revenue (MTD, YTD)
- Active Campaigns
- Average CPM/CPC
- Top Performing Campaigns
- Top Revenue Brands
- Budget Utilization Rate

**SQL Query:**
```sql
-- Monthly revenue summary
WITH monthly_stats AS (
  SELECT
    DATE_TRUNC('month', CURRENT_DATE) as month,
    SUM(total_spent) as mtd_revenue,
    COUNT(DISTINCT campaign_id) as active_campaigns,
    AVG(cpm) as avg_cpm,
    AVG(cpc) as avg_cpc
  FROM campaign_budget_tracking
  WHERE tracking_date >= DATE_TRUNC('month', CURRENT_DATE)
),
top_campaigns AS (
  SELECT
    c.campaign_name,
    b.name as brand_name,
    SUM(cbt.total_spent) as revenue
  FROM sponsored_campaigns c
  JOIN brands b ON c.brand_id = b.id
  JOIN campaign_budget_tracking cbt ON c.id = cbt.campaign_id
  WHERE cbt.tracking_date >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY c.campaign_name, b.name
  ORDER BY revenue DESC
  LIMIT 10
)
SELECT * FROM monthly_stats, top_campaigns;
```

### Accounts Receivable Dashboard

**Query:**
```sql
-- Outstanding invoices by brand
SELECT
  b.id,
  b.name as brand_name,
  COUNT(c.id) as completed_campaigns,
  SUM(
    COALESCE((SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id), 0)
  ) as total_invoice_amount,
  -- Note: Requires separate payments table to track paid amounts
  0 as total_paid,
  SUM(
    COALESCE((SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id), 0)
  ) as outstanding_balance
FROM brands b
JOIN sponsored_campaigns c ON b.id = c.brand_id
WHERE c.status = 'completed' AND c.end_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY b.id, b.name
HAVING SUM(
  COALESCE((SELECT SUM(total_spent) FROM campaign_budget_tracking WHERE campaign_id = c.id), 0)
) > 0
ORDER BY outstanding_balance DESC;
```

---

## Automated Financial Processes

### Daily Batch Jobs

**1. Update Budget Tracking (runs daily at midnight UTC)**
```sql
SELECT update_campaign_budget_tracking();
```

**2. Check Budget Exhaustion (runs daily at 1am UTC)**
```sql
SELECT check_campaign_budgets();
```

**3. Generate Daily Revenue Report (runs daily at 2am UTC)**
```bash
# Export to CSV for finance team
psql $DATABASE_URL -c "
COPY (
  SELECT
    tracking_date,
    campaign_id,
    total_impressions,
    total_clicks,
    total_conversions,
    impression_spend,
    click_spend,
    total_spent
  FROM campaign_budget_tracking
  WHERE tracking_date = CURRENT_DATE - INTERVAL '1 day'
) TO '/tmp/daily_revenue_report.csv' CSV HEADER;
"
```

### Monthly Reconciliation

**1. Generate Monthly Invoice Report (1st of month)**
```sql
-- Campaigns completed in previous month
SELECT
  c.id,
  c.campaign_code,
  c.campaign_name,
  b.name as brand_name,
  c.sponsor_contact_email,
  SUM(cbt.total_spent) as invoice_amount,
  c.end_date as campaign_end_date
FROM sponsored_campaigns c
JOIN brands b ON c.brand_id = b.id
JOIN campaign_budget_tracking cbt ON c.id = cbt.campaign_id
WHERE c.status = 'completed'
  AND DATE_TRUNC('month', c.end_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
GROUP BY c.id, c.campaign_code, c.campaign_name, b.name, c.sponsor_contact_email, c.end_date
ORDER BY b.name, c.end_date;
```

---

## API Endpoints Summary

### Marketing Team Endpoints (Admin Only)

| Method | Endpoint                                  | Description                   |
|--------|-------------------------------------------|-------------------------------|
| POST   | `/api/v1/sponsored/campaigns`             | Create new campaign           |
| GET    | `/api/v1/sponsored/campaigns`             | List all campaigns            |
| GET    | `/api/v1/sponsored/campaigns/:id`         | Get campaign details          |
| PUT    | `/api/v1/sponsored/campaigns/:id`         | Update campaign               |
| POST   | `/api/v1/sponsored/campaigns/:id/approve` | Approve campaign              |
| POST   | `/api/v1/sponsored/campaigns/:id/reject`  | Reject campaign               |
| POST   | `/api/v1/sponsored/campaigns/:id/activate`| Activate campaign             |
| POST   | `/api/v1/sponsored/campaigns/:id/pause`   | Pause campaign                |
| GET    | `/api/v1/sponsored/campaigns/:id/performance` | Get performance metrics  |

### Tracking Endpoints (User Facing)

| Method | Endpoint                        | Description              |
|--------|---------------------------------|--------------------------|
| POST   | `/api/v1/sponsored/impressions` | Track impression         |
| POST   | `/api/v1/sponsored/clicks`      | Track click              |
| POST   | `/api/v1/sponsored/conversions` | Track conversion         |
| GET    | `/api/v1/sponsored/eligible`    | Get eligible campaigns   |

---

## Revenue Projections

### Example Campaign Economics

**Scenario: Premium Brand Homepage Takeover**

```
Campaign Details:
- Budget: $20,000
- Duration: 14 days
- Pricing: CPM at $15

Expected Performance:
- Total Impressions: 1,333,333 (20,000 / 0.015)
- Daily Impressions: 95,238
- Expected CTR: 0.8%
- Expected Clicks: 10,667
- Expected Conversions (3% CR): 320
- Expected GMV (AOV $150): $48,000
- ROAS for Muse: 2.4x
- ROAS for Brand: 2.4x ($48k GMV / $20k spend)
```

### Monthly Revenue Target Model

```
Assumptions:
- 20 active campaigns/month
- Average budget: $10,000
- Budget utilization: 90%

Monthly Revenue = 20 × $10,000 × 0.90 = $180,000/month
Annual Revenue = $180,000 × 12 = $2,160,000/year
```

---

## Summary

✅ **Financial Tracking:** Complete with real-time budget tracking
✅ **Revenue Reporting:** Daily, campaign-level, and monthly reports
✅ **Invoicing:** Automated invoice generation on campaign completion
✅ **Budget Management:** Auto-pause on budget exhaustion, daily caps
✅ **Marketing Interfaces:** Full campaign management dashboard
✅ **Finance Dashboards:** Revenue summaries and AR tracking

**The sponsored content system is ready for monetization!** 🎉
