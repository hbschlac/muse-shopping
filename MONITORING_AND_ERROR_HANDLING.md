# Real-Time Monitoring & Error Handling Assessment

**Date:** 2026-02-08
**Assessment:** Current State vs Production Requirements

---

## Executive Summary

**Current State:** ⚠️ **PARTIAL** - Basic logging and error handling exist, but real-time alerting and customer experience fallbacks need enhancement

**What Exists:**
- ✅ Structured logging (Winston)
- ✅ Error handling middleware
- ✅ Health check endpoints
- ✅ Metrics tracking service
- ✅ Custom error classes

**What's Missing:**
- ❌ Real-time alerting (Sentry, PagerDuty, Slack)
- ❌ API failure detection and auto-retry
- ❌ Frontend error boundaries and user-friendly messages
- ❌ Circuit breaker pattern for external APIs
- ❌ Performance monitoring (response times, slow queries)

---

## 1. Current Monitoring Infrastructure ✅

### Logging System (Winston)

**File:** `src/utils/logger.js`

**What's Implemented:**
```javascript
// Winston logger with:
// - JSON format for production
// - File logging for development (logs/error.log, logs/combined.log)
// - Console logging with colors in dev
// - Timestamp and stack trace capture
// - Configurable log level (default: info)

logger.info('Payment succeeded: pi_123 for session cs_456');
logger.error('Payment capture failed:', error);
logger.warn('CAPTCHA detected on page');
```

**Coverage:**
- ✅ Cart operations (add, remove, update)
- ✅ Checkout flow (session creation, payment, order placement)
- ✅ Payment processing (Stripe intents, webhooks)
- ✅ Manual order tasks
- ✅ Promo code validation

**Limitations:**
- ❌ Logs are local (not aggregated)
- ❌ No log search/filtering in production
- ❌ No log retention policy
- ❌ No real-time alerts on ERROR logs

### Error Handling Middleware

**File:** `src/middleware/errorHandler.js`

**What's Implemented:**
```javascript
// Catches all errors and:
// 1. Logs error with context (path, method, stack)
// 2. Distinguishes operational vs programming errors
// 3. Returns structured error response

// Operational errors (expected):
{
  "success": false,
  "error": {
    "code": "PAYMENT_ERROR",
    "message": "Card was declined"
  }
}

// Programming errors (unexpected):
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Error Classes:** `src/utils/errors.js`
- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)
- `PaymentError` (402)

**Limitations:**
- ❌ No error aggregation (count by type, track spikes)
- ❌ No automatic retry for transient failures
- ❌ No fallback responses for degraded services

### Health Check Endpoints

**File:** `src/routes/index.js`

**Endpoints:**

1. **`GET /api/v1/health`** - Liveness check
   ```json
   {
     "success": true,
     "data": {
       "status": "healthy",
       "timestamp": "2026-02-08T12:00:00Z",
       "uptime": 3600
     }
   }
   ```

2. **`GET /api/v1/health/ready`** - Readiness check
   ```json
   {
     "success": true,
     "data": {
       "status": "ready",
       "checks": {
         "db": true,
         "openai": true
       },
       "timestamp": "2026-02-08T12:00:00Z"
     }
   }
   ```

**Missing Checks:**
- ❌ Stripe API connectivity
- ❌ Database connection pool status
- ❌ Memory/CPU usage
- ❌ Disk space

### Metrics Tracking Service

**File:** `src/services/metricsService.js`

**What's Tracked:**
- ✅ User sessions (start, end, duration)
- ✅ Page views (entry, exit, scroll depth)
- ✅ Conversion funnels (browse → cart → checkout → purchase)
- ✅ Cart events (add, remove, quantity change, conversion)

**Example:**
```javascript
// Track checkout funnel
MetricsService.trackFunnelStage({
  sessionId: 'sess_123',
  userId: 456,
  funnelStage: 'checkout',
  metadata: { cartValue: 5999 }
});
```

**Limitations:**
- ❌ Not tracking API failures
- ❌ Not tracking payment failures by reason
- ❌ Not tracking order placement success rate
- ❌ No real-time dashboards

---

## 2. What's Missing for Production ❌

### A. Real-Time Alerting

**Current State:** Errors are logged but no one is notified

**What's Needed:**

#### Sentry Integration (Recommended)
```javascript
// Add to src/app.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions

  beforeSend(event, hint) {
    // Filter out noise
    const error = hint.originalException;
    if (error && error.code === 'VALIDATION_ERROR') {
      return null; // Don't send validation errors to Sentry
    }
    return event;
  },
});

// Add after routes
app.use(Sentry.Handlers.errorHandler());
```

**Alerts to Configure:**
- Payment failures > 5% in 5 minutes
- Checkout initiation errors > 10 in 1 minute
- Database connection failures (any)
- Stripe webhook signature failures (any)
- Out of stock errors > 20% of cart items

#### Slack Webhook Alerts
```javascript
// src/services/alertService.js
class AlertService {
  static async sendSlackAlert(severity, title, message, metadata = {}) {
    if (!process.env.SLACK_WEBHOOK_URL) return;

    const color = severity === 'critical' ? '#FF0000' :
                  severity === 'warning' ? '#FFA500' : '#FFFF00';

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title,
          text: message,
          fields: Object.entries(metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          })),
          footer: 'Muse Shopping API',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    });
  }

  static async alertPaymentFailure(error, paymentIntentId, userId) {
    await this.sendSlackAlert(
      'critical',
      '💳 Payment Failure',
      `Payment intent ${paymentIntentId} failed`,
      {
        'User ID': userId,
        'Error': error.message,
        'Payment Intent': paymentIntentId,
      }
    );
  }

  static async alertCheckoutFailure(sessionId, error) {
    await this.sendSlackAlert(
      'warning',
      '🛒 Checkout Failure',
      `Checkout session ${sessionId} failed`,
      {
        'Session': sessionId,
        'Error': error.message,
      }
    );
  }
}
```

**Environment Variables Needed:**
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
PAGERDUTY_INTEGRATION_KEY=xxx  # For critical alerts
```

### B. API Failure Detection & Auto-Retry

**Current State:** API calls fail silently or throw errors

**What's Needed:**

#### Retry Logic with Exponential Backoff
```javascript
// src/utils/retryHelper.js
class RetryHelper {
  static async withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2,
      retryableErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
    } = options;

    let lastError;
    let delayMs = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on non-retryable errors
        if (!this.isRetryable(error, retryableErrors)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`, {
          error: error.message,
          attempt: attempt + 1
        });

        await this.sleep(delayMs);
        delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
      }
    }

    throw lastError;
  }

  static isRetryable(error, retryableErrors) {
    if (error.code && retryableErrors.includes(error.code)) {
      return true;
    }
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true; // Server errors
    }
    if (error.statusCode === 429) {
      return true; // Rate limit
    }
    return false;
  }

  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage in services:
const taxResult = await RetryHelper.withRetry(
  () => TaxCalculationService.calculateTax(params),
  { maxRetries: 2, initialDelayMs: 500 }
);
```

#### Circuit Breaker Pattern
```javascript
// src/utils/circuitBreaker.js
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute

    this.failures = 0;
    this.successes = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        logger.warn(`Circuit breaker ${this.name} is OPEN, using fallback`);
        if (fallback) return await fallback();
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
      this.state = 'HALF_OPEN';
      this.successes = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) return await fallback();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        logger.info(`Circuit breaker ${this.name} is now CLOSED`);
      }
    }
  }

  onFailure() {
    this.failures++;
    this.successes = 0;

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      logger.error(`Circuit breaker ${this.name} is now OPEN`);
      AlertService.sendSlackAlert(
        'critical',
        `🔌 Circuit Breaker Opened: ${this.name}`,
        `Circuit breaker for ${this.name} has opened after ${this.failures} failures`
      );
    }
  }
}

// Usage:
const stripeCircuitBreaker = new CircuitBreaker('stripe', {
  failureThreshold: 5,
  timeout: 60000
});

const paymentIntent = await stripeCircuitBreaker.execute(
  () => StripeService.createPaymentIntent(params),
  () => {
    // Fallback: Create manual payment task
    return { requiresManualPayment: true };
  }
);
```

### C. Frontend Error Boundaries & User Experience

**Current State:** Frontend errors not gracefully handled

**What's Needed:**

#### Error Response Standards
```javascript
// All API errors should return:
{
  "success": false,
  "error": {
    "code": "PAYMENT_ERROR",
    "message": "Your card was declined. Please try a different payment method.",
    "userMessage": "We couldn't process your payment. Please check your card details or try another card.",
    "recoverable": true,
    "suggestedActions": [
      "Try a different card",
      "Contact your bank",
      "Use a different payment method"
    ]
  }
}
```

#### Update Error Classes
```javascript
// src/utils/errors.js
class PaymentError extends AppError {
  constructor(message, userMessage = null, suggestedActions = []) {
    super(message, 402, 'PAYMENT_ERROR');
    this.userMessage = userMessage || 'Payment processing failed. Please try again.';
    this.suggestedActions = suggestedActions;
    this.recoverable = true;
  }
}

class CheckoutError extends AppError {
  constructor(message, userMessage = null, recoverable = true) {
    super(message, 400, 'CHECKOUT_ERROR');
    this.userMessage = userMessage || 'There was an issue with your checkout. Please try again.';
    this.recoverable = recoverable;
  }
}
```

#### Frontend Error Display (Example)
```typescript
// Frontend: Handle API errors gracefully
try {
  const response = await fetch('/api/v1/checkout/sessions/:id/place', {
    method: 'POST',
  });

  const data = await response.json();

  if (!data.success) {
    // Show user-friendly error message
    toast.error(
      data.error.userMessage || 'Something went wrong. Please try again.',
      {
        action: data.error.suggestedActions?.[0]
          ? { label: data.error.suggestedActions[0], onClick: () => {} }
          : null
      }
    );

    // Log technical details for debugging
    console.error('Checkout failed:', data.error);

    // Track error in analytics
    analytics.track('checkout_error', {
      errorCode: data.error.code,
      errorMessage: data.error.message,
      recoverable: data.error.recoverable,
    });
  }
} catch (error) {
  // Network error or server down
  toast.error(
    'Unable to connect. Please check your internet connection and try again.'
  );
}
```

### D. Performance Monitoring

**What's Needed:**

#### Response Time Tracking
```javascript
// src/middleware/performanceMonitoring.js
const performanceMonitoring = (req, res, next) => {
  const startTime = Date.now();

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration,
        statusCode: res.statusCode,
      });
    }

    // Track metrics
    MetricsService.trackAPIRequest({
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
};
```

#### Database Query Monitoring
```javascript
// Wrap pool.query to log slow queries
const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  const startTime = Date.now();
  try {
    const result = await originalQuery(...args);
    const duration = Date.now() - startTime;

    if (duration > 500) {
      logger.warn('Slow query detected', {
        query: args[0],
        duration,
      });
    }

    return result;
  } catch (error) {
    logger.error('Query error', {
      query: args[0],
      error: error.message,
    });
    throw error;
  }
};
```

---

## 3. Recommended Monitoring Stack

### Minimal (Launch Ready)

**Total Cost:** ~$0-50/month

1. **Sentry** (Error Tracking)
   - Free tier: 5,000 errors/month
   - Captures all backend errors
   - Source maps for stack traces
   - Slack integration

2. **Slack Webhooks** (Alerts)
   - Free
   - Critical alerts (payment failures, checkout errors)
   - Manual order queue notifications

3. **Health Checks** (Already built)
   - Uptime monitoring via external service (UptimeRobot - free)
   - Ping /health every 5 minutes

### Intermediate (Month 2-3)

**Total Cost:** ~$100-200/month

Add:
4. **Datadog** or **New Relic** (APM)
   - Response time monitoring
   - Database query performance
   - Infrastructure metrics
   - Custom dashboards

5. **LogDNA** or **Logtail** (Log Aggregation)
   - Centralized logs
   - Search and filter
   - Retention (30 days)

### Advanced (Scale)

**Total Cost:** ~$500+/month

Add:
6. **PagerDuty** (On-Call)
   - Escalation policies
   - Incident management
   - Phone/SMS alerts for critical issues

7. **Grafana** + **Prometheus** (Metrics)
   - Custom metrics dashboards
   - Business metrics (revenue, conversion rate)
   - SLA tracking

---

## 4. Customer Experience Matrix

| Scenario | Backend Response | Frontend Display | User Action |
|----------|-----------------|------------------|-------------|
| **Payment Declined** | `PaymentError` with reason | "Your card was declined. Please try another card." | Retry with different card |
| **Stripe API Down** | Circuit breaker fallback | "Payment processing unavailable. Your order will be processed manually." | Email confirmation sent |
| **Out of Stock** | `ValidationError` | "Some items are out of stock. We've removed them from your cart." | Review cart |
| **Session Expired** | `AuthenticationError` | "Your session expired. Redirecting to login..." | Auto-redirect |
| **Network Timeout** | Retry 3x, then fail | "Connection issue. Retrying..." then "Please try again." | Retry button |
| **Tax Calc Failure** | Use fallback state rate | *Silent* - Uses simplified tax | Order proceeds |
| **Shipping Calc Failure** | Use fallback tier rate | *Silent* - Uses standard rate | Order proceeds |
| **Promo Invalid** | `ValidationError` | "Promo code 'SAVE20' is not valid. Please check and try again." | Enter new code |
| **Database Down** | Health check fails (503) | "Service temporarily unavailable. Please try again in a few minutes." | Retry later |
| **Manual Order Created** | Success with flag | "Order received! We'll process it manually and email confirmation within 1 hour." | Email follow-up |

---

## 5. Quick Wins (Implement Today)

### Priority 1: Slack Alerts (30 minutes)
```bash
# Add to .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Create src/services/alertService.js (use code above)

# Update critical error points:
# - CheckoutService.placeOrders() - alert on failures
# - StripeWebhookController - alert on payment failures
# - ManualOrderService.createManualOrderTask() - alert ops team
```

### Priority 2: Enhanced Error Messages (1 hour)
```javascript
// Update all error throws to include user-friendly messages
throw new PaymentError(
  error.message, // Technical message (logged)
  'Your payment could not be processed. Please check your card details.', // User message
  ['Try a different card', 'Contact your bank'] // Suggested actions
);
```

### Priority 3: Health Check Enhancement (30 minutes)
```javascript
// Add Stripe check to /health/ready
router.get('/health/ready', async (req, res) => {
  const checks = {
    db: false,
    stripe: false,
  };

  try {
    await pool.query('SELECT 1');
    checks.db = true;
  } catch (error) {
    checks.db = false;
  }

  try {
    await StripeService.healthCheck();
    checks.stripe = true;
  } catch (error) {
    checks.stripe = false;
  }

  const ready = checks.db && checks.stripe;
  res.status(ready ? 200 : 503).json({
    success: ready,
    data: { status: ready ? 'ready' : 'not_ready', checks }
  });
});
```

---

## 6. Summary

### ✅ What Works Today

- Structured logging (all errors captured)
- Error handling middleware (operational vs programming errors)
- Health checks (liveness and readiness)
- Metrics tracking (sessions, funnels, cart events)
- Custom error classes with status codes

### ❌ What's Missing for Production

- Real-time alerting (Sentry, Slack, PagerDuty)
- API failure auto-retry with exponential backoff
- Circuit breaker pattern for external services
- User-friendly error messages in API responses
- Performance monitoring (slow queries, slow requests)
- Log aggregation and search
- Frontend error boundaries

### 🎯 Recommended Timeline

**Week 1 (Launch):**
- ✅ Add Slack webhook alerts (30 min)
- ✅ Enhance error messages with user-facing text (1 hour)
- ✅ Add Stripe health check (30 min)

**Week 2 (Post-Launch):**
- Add Sentry integration (2 hours)
- Add retry logic to critical API calls (4 hours)
- Set up UptimeRobot health check monitoring (30 min)

**Month 2:**
- Implement circuit breakers for Stripe, Tax, Shipping APIs (1 day)
- Add performance monitoring middleware (1 day)
- Set up Datadog or New Relic APM (1 day)

---

## Conclusion

**Current Monitoring:** Basic but functional for launch
**Customer Experience:** Needs enhancement for production quality
**Recommendation:** Implement Priority 1-3 quick wins before launch (2 hours total)

The system logs everything needed for debugging, but lacks real-time alerts and graceful degradation. With the quick wins implemented, you'll have sufficient monitoring to catch and respond to issues quickly during launch.

---

**Prepared by:** Backend Engineering
**Date:** 2026-02-08
**Status:** ⚠️ Needs enhancement before production (2 hours of work)
