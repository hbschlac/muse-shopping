/**
 * Email Parser Utilities
 * Functions for parsing and extracting brand information from emails
 */

/**
 * Order confirmation keywords to identify shopping emails
 */
const ORDER_KEYWORDS = [
  'order confirmation',
  'order receipt',
  'purchase confirmation',
  'thank you for your order',
  'order details',
  'order number',
  'order #',
  'your order',
  'receipt',
  'order summary',
  'order placed',
  'payment confirmation',
  'shipment confirmation',
  'shipping confirmation',
];

/**
 * Check if an email is likely an order confirmation
 * @param {Object} email - Email object with subject and snippet
 * @returns {boolean} True if email appears to be an order confirmation
 */
function isOrderConfirmation(email) {
  const subject = (email.subject || '').toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const combined = `${subject} ${snippet}`;

  return ORDER_KEYWORDS.some((keyword) => combined.includes(keyword));
}

/**
 * Extract domain from email address
 * @param {string} email - Email address
 * @returns {string|null} Domain or null if invalid
 */
function extractSenderDomain(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (!match) {
    return null;
  }

  let domain = match[1].toLowerCase();

  // Remove common email subdomains
  domain = domain.replace(/^(email\.|mail\.|orders\.|noreply\.)/, '');

  return domain;
}

/**
 * Extract full email address including subdomain
 * @param {string} email - Email address
 * @returns {string|null} Full email or null if invalid
 */
function extractFullEmail(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const match = email.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Extract brand name from subject line
 * Common patterns:
 * - "Your [Brand] Order #12345"
 * - "[Brand] Order Confirmation"
 * - "Order Confirmation - [Brand]"
 * @param {string} subject - Email subject line
 * @returns {string[]|null} Array of potential brand names or null
 */
function extractBrandFromSubject(subject) {
  if (!subject || typeof subject !== 'string') {
    return null;
  }

  const brands = [];

  // Pattern: "Your [Brand] Order"
  const pattern1 = /your\s+([a-zA-Z0-9&\s'-]+?)\s+order/i;
  const match1 = subject.match(pattern1);
  if (match1) {
    brands.push(match1[1].trim());
  }

  // Pattern: "[Brand] Order" or "Order from [Brand]"
  const pattern2 = /(?:^|\s)([a-zA-Z0-9&\s'-]{2,30}?)\s+order|order\s+from\s+([a-zA-Z0-9&\s'-]{2,30})/i;
  const match2 = subject.match(pattern2);
  if (match2) {
    const brand = match2[1] || match2[2];
    if (brand) {
      brands.push(brand.trim());
    }
  }

  // Pattern: "Order Confirmation - [Brand]"
  const pattern3 = /order\s+confirmation\s*[-:]\s*([a-zA-Z0-9&\s'-]{2,30})/i;
  const match3 = subject.match(pattern3);
  if (match3) {
    brands.push(match3[1].trim());
  }

  // Pattern: "[Brand] - Order"
  const pattern4 = /^([a-zA-Z0-9&\s'-]{2,30})\s*[-:]\s*order/i;
  const match4 = subject.match(pattern4);
  if (match4) {
    brands.push(match4[1].trim());
  }

  return brands.length > 0 ? [...new Set(brands)] : null;
}

/**
 * Extract brand name from email body
 * Looks for common phrases like "Thank you for shopping at [Brand]"
 * @param {string} body - Email body text
 * @returns {string[]|null} Array of potential brand names or null
 */
function extractBrandFromBody(body) {
  if (!body || typeof body !== 'string') {
    return null;
  }

  const brands = [];

  // Pattern: "Thank you for shopping at/with [Brand]"
  const pattern1 = /thank\s+you\s+for\s+shopping\s+(?:at|with)\s+([a-zA-Z0-9&\s'-]{2,30})/i;
  const match1 = body.match(pattern1);
  if (match1) {
    brands.push(match1[1].trim());
  }

  // Pattern: "Welcome to [Brand]" or "Hello from [Brand]"
  const pattern2 = /(?:welcome\s+to|hello\s+from)\s+([a-zA-Z0-9&\s'-]{2,30})/i;
  const match2 = body.match(pattern2);
  if (match2) {
    brands.push(match2[1].trim());
  }

  // Pattern: "[Brand] Order Confirmation"
  const pattern3 = /^([a-zA-Z0-9&\s'-]{2,30})\s+order\s+confirmation/im;
  const match3 = body.match(pattern3);
  if (match3) {
    brands.push(match3[1].trim());
  }

  return brands.length > 0 ? [...new Set(brands)] : null;
}

/**
 * Parse email headers to extract sender information
 * @param {Array} headers - Gmail API headers array
 * @returns {Object} Parsed header information
 */
function parseEmailHeaders(headers) {
  const parsed = {
    from: null,
    fromEmail: null,
    subject: null,
    date: null,
  };

  if (!headers || !Array.isArray(headers)) {
    return parsed;
  }

  headers.forEach((header) => {
    const name = header.name.toLowerCase();
    switch (name) {
      case 'from':
        parsed.from = header.value;
        parsed.fromEmail = extractFullEmail(header.value);
        break;
      case 'subject':
        parsed.subject = header.value;
        break;
      case 'date':
        parsed.date = new Date(header.value);
        break;
    }
  });

  return parsed;
}

/**
 * Clean and normalize brand name
 * @param {string} brandName - Raw brand name
 * @returns {string} Cleaned brand name
 */
function cleanBrandName(brandName) {
  if (!brandName || typeof brandName !== 'string') {
    return '';
  }

  let cleaned = brandName.trim();

  // Remove common noise words
  const noiseWords = ['the', 'inc', 'llc', 'ltd', 'co', 'corp', 'corporation'];
  noiseWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Extract all potential brand identifiers from an email
 * @param {Object} email - Email object from Gmail API
 * @returns {Object} Extracted brand information
 */
function extractAllBrandIdentifiers(email) {
  const identifiers = {
    domain: null,
    fullEmail: null,
    subjectBrands: [],
    bodyBrands: [],
  };

  // Parse headers
  const headers = parseEmailHeaders(email.payload?.headers || []);

  // Extract domain
  if (headers.fromEmail) {
    identifiers.domain = extractSenderDomain(headers.fromEmail);
    identifiers.fullEmail = headers.fromEmail;
  }

  // Extract from subject
  if (headers.subject) {
    const subjectBrands = extractBrandFromSubject(headers.subject);
    if (subjectBrands) {
      identifiers.subjectBrands = subjectBrands.map(cleanBrandName).filter(Boolean);
    }
  }

  // Extract from body (snippet)
  if (email.snippet) {
    const bodyBrands = extractBrandFromBody(email.snippet);
    if (bodyBrands) {
      identifiers.bodyBrands = bodyBrands.map(cleanBrandName).filter(Boolean);
    }
  }

  return identifiers;
}

/**
 * Decode base64url encoded string
 * @param {string} str - Base64url encoded string
 * @returns {string} Decoded string
 */
function decodeBase64Url(str) {
  if (!str) return '';

  // Replace URL-safe characters
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');

  // Decode from base64
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Fashion categories (in scope)
 */
const FASHION_CATEGORIES = [
  'clothing', 'apparel', 'fashion', 'wear',
  'jeans', 'pants', 'denim', 'trousers',
  'dress', 'skirt', 'top', 'blouse', 'shirt', 't-shirt', 'tee',
  'sweater', 'cardigan', 'hoodie', 'sweatshirt',
  'jacket', 'coat', 'outerwear',
  'shoes', 'sneakers', 'boots', 'sandals', 'heels',
  'accessories', 'bag', 'purse', 'wallet', 'belt',
  'jewelry', 'necklace', 'bracelet', 'earrings', 'ring',
  'hat', 'cap', 'scarf', 'gloves',
  'activewear', 'athletic', 'sportswear', 'yoga', 'running',
  'swimwear', 'bikini', 'swimsuit',
  'underwear', 'lingerie', 'bra', 'socks',
];

/**
 * Out of scope categories (filter these out)
 */
const OUT_OF_SCOPE_CATEGORIES = [
  'home', 'furniture', 'decor', 'bedding', 'kitchen',
  'skincare', 'makeup', 'beauty', 'cosmetics',
  'electronics', 'phone', 'laptop', 'tablet',
  'grocery', 'food', 'snacks',
  'books', 'toys', 'games',
];

/**
 * Size patterns to detect clothing sizes
 */
const SIZE_PATTERNS = [
  /\b(xx?s|s|m|l|xl|xxl|xxxl)\b/gi, // XS, S, M, L, XL, etc.
  /\bsize[:\s]+(\d+|xx?s|s|m|l|xl|xxl)\b/gi, // Size: M, Size 8
  /\b(\d{1,2})\s*(?:in|inch|"|cm)\b/gi, // 32 in, 34"
  /\b(petite|regular|tall|plus)\b/gi, // Body types
  /\b(\d+\/\d+)\b/g, // 28/30, 32/34
];

/**
 * Price patterns
 */
const PRICE_PATTERNS = [
  /\$\s*(\d{1,4}(?:[,.]\d{2})?)/g, // $49.99, $1,299.00
  /(?:price|total|subtotal|amount)[:\s]+\$?\s*(\d{1,4}(?:[,.]\d{2})?)/gi,
  /(\d{1,4}(?:[,.]\d{2})?)\s*USD/gi,
];

/**
 * Extract fashion-related products from email body
 * @param {string} body - Email body text
 * @param {string} subject - Email subject
 * @returns {Array} Array of product objects
 */
function extractProducts(body, subject) {
  if (!body) return [];

  const products = [];
  const text = `${subject || ''} ${body}`.toLowerCase();

  // Check if this email is about fashion (in scope)
  const isFashion = FASHION_CATEGORIES.some(category => text.includes(category));
  const isOutOfScope = OUT_OF_SCOPE_CATEGORIES.some(category => text.includes(category));

  if (!isFashion || isOutOfScope) {
    return []; // Not a fashion purchase
  }

  // Try to extract line items (common in order confirmations)
  const lines = body.split(/\n+/);

  for (const line of lines) {
    const lineLower = line.toLowerCase();

    // Skip header/footer lines
    if (lineLower.includes('shipping') || lineLower.includes('tax') ||
        lineLower.includes('total:') || lineLower.includes('subtotal:')) {
      continue;
    }

    // Look for fashion category mentions
    const categoryMatch = FASHION_CATEGORIES.find(cat => lineLower.includes(cat));

    if (categoryMatch) {
      const product = {
        name: line.trim().substring(0, 100), // First 100 chars of line
        category: categoryMatch,
        size: extractSize(line),
        price: extractPrice(line),
        quantity: extractQuantity(line),
      };

      products.push(product);
    }
  }

  // If no line items found, create a general product from the email
  if (products.length === 0 && isFashion) {
    products.push({
      name: 'Fashion Item',
      category: FASHION_CATEGORIES.find(cat => text.includes(cat)) || 'clothing',
      size: extractSize(text),
      price: extractPrice(text),
      quantity: 1,
    });
  }

  return products;
}

/**
 * Extract size from text
 * @param {string} text - Text to search
 * @returns {string|null} Size or null
 */
function extractSize(text) {
  for (const pattern of SIZE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim().toUpperCase();
    }
  }
  return null;
}

/**
 * Extract price from text
 * @param {string} text - Text to search
 * @returns {number|null} Price in cents or null
 */
function extractPrice(text) {
  for (const pattern of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const priceStr = match[1] || match[0];
      const price = parseFloat(priceStr.replace(/[,$]/g, ''));
      if (price > 0 && price < 10000) { // Sanity check
        return Math.round(price * 100); // Return cents
      }
    }
  }
  return null;
}

/**
 * Extract quantity from text
 * @param {string} text - Text to search
 * @returns {number} Quantity (defaults to 1)
 */
function extractQuantity(text) {
  const match = text.match(/\bqty[:\s]+(\d+)\b|\bquantity[:\s]+(\d+)\b|x\s*(\d+)\b/i);
  if (match) {
    const qty = parseInt(match[1] || match[2] || match[3]);
    if (qty > 0 && qty < 100) {
      return qty;
    }
  }
  return 1;
}

/**
 * Extract order total from email
 * @param {string} body - Email body text
 * @returns {number|null} Total in cents or null
 */
function extractOrderTotal(body) {
  if (!body) return null;

  const patterns = [
    /(?:order\s+)?total[:\s]+\$?\s*(\d{1,5}(?:[,.]\d{2})?)/gi,
    /amount\s+paid[:\s]+\$?\s*(\d{1,5}(?:[,.]\d{2})?)/gi,
    /grand\s+total[:\s]+\$?\s*(\d{1,5}(?:[,.]\d{2})?)/gi,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const total = parseFloat(match[1].replace(/[,$]/g, ''));
      if (total > 0) {
        return Math.round(total * 100); // Return cents
      }
    }
  }

  return null;
}

/**
 * Extract order number from email
 * @param {string} body - Email body text
 * @param {string} subject - Email subject
 * @returns {string|null} Order number or null
 */
function extractOrderNumber(body, subject) {
  const text = `${subject || ''} ${body || ''}`;

  const patterns = [
    /order\s*#\s*[:\s]*([A-Z0-9-]{5,20})/i,
    /order\s+number[:\s]+([A-Z0-9-]{5,20})/i,
    /confirmation\s+#\s*[:\s]*([A-Z0-9-]{5,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Build shopper profile from products
 * @param {Array} products - Array of products from all emails
 * @returns {Object} Shopper profile with preferences
 */
function buildShopperProfile(products) {
  const profile = {
    categories: {},
    sizes: {},
    priceRange: {
      min: Infinity,
      max: 0,
      avg: 0,
      total: 0,
      count: 0,
    },
    totalSpent: 0,
    totalItems: 0,
    interests: [],
  };

  for (const product of products) {
    // Track categories
    if (product.category) {
      profile.categories[product.category] = (profile.categories[product.category] || 0) + 1;
    }

    // Track sizes
    if (product.size) {
      profile.sizes[product.size] = (profile.sizes[product.size] || 0) + 1;
    }

    // Track price range
    if (product.price) {
      const priceInDollars = product.price / 100;
      profile.priceRange.min = Math.min(profile.priceRange.min, priceInDollars);
      profile.priceRange.max = Math.max(profile.priceRange.max, priceInDollars);
      profile.priceRange.total += priceInDollars;
      profile.priceRange.count++;
      profile.totalSpent += priceInDollars;
    }

    // Track total items
    profile.totalItems += product.quantity || 1;
  }

  // Calculate average price
  if (profile.priceRange.count > 0) {
    profile.priceRange.avg = profile.priceRange.total / profile.priceRange.count;
  }

  // Determine interests from categories
  const sortedCategories = Object.entries(profile.categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  profile.interests = sortedCategories.map(([category, count]) => ({
    category,
    count,
    percentage: Math.round((count / products.length) * 100),
  }));

  // Determine most common sizes
  const sortedSizes = Object.entries(profile.sizes)
    .sort((a, b) => b[1] - a[1]);

  profile.commonSizes = sortedSizes.slice(0, 3).map(([size]) => size);

  return profile;
}

/**
 * Check if email is about fashion (in scope)
 * @param {string} body - Email body
 * @param {string} subject - Email subject
 * @returns {boolean} True if fashion-related
 */
function isFashionEmail(body, subject) {
  const text = `${subject || ''} ${body || ''}`.toLowerCase();

  const hasFashion = FASHION_CATEGORIES.some(category => text.includes(category));
  const hasOutOfScope = OUT_OF_SCOPE_CATEGORIES.some(category => text.includes(category));

  return hasFashion && !hasOutOfScope;
}

/**
 * Get email body from Gmail message payload
 * @param {Object} message - Gmail message object
 * @returns {string} Email body text
 */
function getEmailBody(message) {
  if (!message || !message.payload) {
    return '';
  }

  // Try to get body from direct body.data
  if (message.payload.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }

  // If multipart, recursively search parts
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }

      if (part.mimeType === 'text/html' && part.body?.data) {
        // Fallback to HTML if no plain text
        return decodeBase64Url(part.body.data);
      }

      // Recursively check nested parts
      if (part.parts) {
        const nestedBody = getEmailBody({ payload: part });
        if (nestedBody) return nestedBody;
      }
    }
  }

  // Fallback to snippet
  return message.snippet || '';
}

/**
 * Extract order details from email body
 * @param {string} body - Email body text
 * @returns {Object} Order details
 */
function extractOrderDetails(body) {
  if (!body) {
    return {
      orderNumber: null,
      totalCents: null,
    };
  }

  // Extract order number from body
  const orderNumber = extractOrderNumber(body, '');

  // Extract order total
  const totalCents = extractOrderTotal(body);

  return {
    orderNumber,
    totalCents,
  };
}

module.exports = {
  isOrderConfirmation,
  extractSenderDomain,
  extractFullEmail,
  extractBrandFromSubject,
  extractBrandFromBody,
  parseEmailHeaders,
  cleanBrandName,
  extractAllBrandIdentifiers,
  decodeBase64Url,
  extractProducts,
  extractOrderTotal,
  extractOrderNumber,
  buildShopperProfile,
  isFashionEmail,
  getEmailBody,
  extractOrderDetails,
};
