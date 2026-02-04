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
  original_price?: number;
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
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
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

// API Error Type
export interface APIErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}
