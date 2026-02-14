/**
 * Type definitions for Muse Shopping API
 */

// User Types
export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Brand Types
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  website_url?: string;
  is_active: boolean;
  category?: string;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  brand_id: string;
  brand_name: string;
  price: number;
  price_cents?: number;
  original_price?: number;
  original_price_cents?: number;
  currency: string;
  image_url: string;
  images?: string[];
  description?: string;
  category?: string;
  subcategory?: string;
  sizes_available?: string[];
  colors_available?: string[];
  in_stock: boolean;
  retailer_name: string;
  retailer_product_url: string;
  created_at: string;
  updated_at: string;
  media_type?: string;
  video_url?: string;
  video_poster_url?: string;
}

export interface ProductDetails extends Product {
  similar_products?: Product[];
  recommendations?: Product[];
}

// Newsfeed Types
export interface Story {
  id: string;
  title: string;
  thumbnail_url?: string;
  type: 'trending' | 'brand' | 'category' | 'style';
  url?: string;
}

export interface BrandModule {
  id: string;
  brand: Brand;
  products: Product[];
  context?: string;
  is_favorite?: boolean;
  layout?: {
    type?: string;
    items_per_view?: number;
    aspect_ratio?: string;
  };
  hero?: {
    image_url?: string;
    video_url?: string;
    poster_url?: string;
    source?: string;
  };
  styling?: {
    background_color?: string;
    text_color?: string;
    gradient_overlay?: string;
    overlay_opacity?: number;
  };
  content?: {
    title?: string;
    subtitle?: string;
    cta_text?: string;
    show_brand_logo?: boolean;
    show_item_details?: boolean;
  };
  featured_item_id?: string | number;
  display_config?: any;
  module_type?: string;
  item_count?: number;
  experiment?: {
    experiment_id?: number;
    variant_id?: number;
    variant_name?: string;
    in_experiment?: boolean;
  };
}

export interface HeroCampaign {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  cta_url: string;
  image_url?: string;
  gradient?: string;
  is_active: boolean;
  priority: number;
}

export interface NewsfeedResponse {
  hero_campaigns: HeroCampaign[];
  stories: Story[];
  brand_modules: BrandModule[];
  sponsored_content?: any[];
}

// Cart Types
export interface CartItem {
  id: string;
  product_id: string;
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
  added_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  total_items: number;
  subtotal: number;
  updated_at: string;
}

// Order Types
export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: CartItem[];
  subtotal: number;
  shipping_cost: number;
  tax: number;
  total: number;
  shipping_address: Address;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  street_address: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// User Preferences Types
export interface StylePreference {
  id: string;
  user_id: string;
  preferred_styles?: string[];
  preferred_brands?: string[];
  size_preferences?: Record<string, string>;
  budget_range?: {
    min: number;
    max: number;
  };
  color_preferences?: string[];
  avoided_materials?: string[];
  created_at: string;
  updated_at: string;
}

// Chat Types
export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  created_at?: string;
}

export interface ChatResponse {
  message: string;
  products?: Product[];
  suggestions?: string[];
  session_id?: string;
}

// Search Types
export interface SearchFilters {
  brands?: string[];
  categories?: string[];
  price_min?: number;
  price_max?: number;
  sizes?: string[];
  colors?: string[];
  in_stock_only?: boolean;
}

export interface SearchResponse {
  products: Product[];
  total_results: number;
  page: number;
  page_size: number;
  filters_applied: SearchFilters;
}

// Saved Items Types
export interface SavedItem {
  id: string;
  user_id: string;
  product_id: string;
  product: Product;
  notes?: string;
  saved_at: string;
}

// Campaign Types
export interface CampaignItem {
  id: string;
  name: string;
  image_url: string;
  price: number;
  sale_price?: number;
  brand_name: string;
  categories?: string[];
}

export interface CampaignDetails {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  image_url: string;
  video_url?: string;
  gradient?: string;
  items: CampaignItem[];
  created_at: string;
}

// API Error Type
export interface APIErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

// Checkout Types
export interface CheckoutSession {
  id: string;
  sessionId?: string;
  status: string;
  items: any[];
  total_cents: number;
  totalCents?: number;
  subtotalCents?: number;
  shippingCents?: number;
  currency: string;
  created_at: string;
  shippingPreferences?: any;
  recipient?: any;
  shipping_address?: any;
  shippingAddress?: any;
  billing_address?: any;
  billingAddress?: any;
  payment_method?: any;
  paymentMethod?: any;
  paymentMethodId?: string;
  paymentMethods?: Record<string, any>;
  promo?: {
    code: string;
    [key: string]: any;
  };
  cartSnapshot?: {
    stores: Array<{
      storeId: number;
      storeName: string;
      items: any[];
      [key: string]: any;
    }>;
    [key: string]: any;
  };
}

export interface CheckoutReadiness {
  ready: boolean;
  missing_fields: string[];
  stores?: any[];
}

// Checkout payload types
export interface CheckoutShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

export interface CheckoutRecipient {
  name: string;
  email: string;
  phone: string;
}

export interface CheckoutBillingPayload {
  sameAsShipping: boolean;
  billingAddress?: CheckoutShippingAddress;
}

export interface CheckoutPaymentPayload {
  paymentMethodId: string;
  storeId?: number;
}

export interface CheckoutPromoPayload {
  code: string;
}

export interface CheckoutShippingSelectionsPayload {
  selections: Record<string, { optionId: string; checkoutMode?: string }>;
}

export interface CheckoutPlaceOrdersResult {
  success: boolean;
  summary: {
    successfulOrders: number;
    failedOrders: number;
  };
  orders?: any[];
}

// Store Account Types
export interface StoreAccount {
  id: number;
  storeId: number;
  storeName?: string;
  isLinked: boolean;
  total_orders?: number;
  [key: string]: any;
}

export interface StoreAccountsSummary {
  stores: StoreAccount[];
  [key: string]: any;
}

export interface StoreAccountPaymentMethodPayload {
  paymentMethodToken: string;
  [key: string]: any;
}
