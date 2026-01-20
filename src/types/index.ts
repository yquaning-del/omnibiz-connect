export type BusinessVertical = 'restaurant' | 'hotel' | 'pharmacy' | 'retail' | 'property';

export type AppRole = 'super_admin' | 'org_admin' | 'location_manager' | 'department_lead' | 'staff';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_vertical: BusinessVertical;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  organization_id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  vertical: BusinessVertical;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  organization_id?: string;
  location_id?: string;
  role: AppRole;
  created_at: string;
}

export interface Product {
  id: string;
  organization_id: string;
  location_id?: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  subcategory?: string;
  vertical: BusinessVertical;
  unit_price: number;
  cost_price?: number;
  tax_rate?: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  image_url?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  loyalty_points: number;
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  organization_id: string;
  location_id: string;
  customer_id?: string;
  order_number: string;
  vertical: BusinessVertical;
  status: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method?: string;
  payment_status: string;
  notes?: string;
  metadata: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface StaffSchedule {
  id: string;
  user_id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Dashboard stats
export interface DashboardStats {
  totalSales: number;
  ordersToday: number;
  averageOrderValue: number;
  lowStockItems: number;
  activeCustomers: number;
  pendingOrders: number;
}

// Navigation
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}

// Vertical config
export interface VerticalConfig {
  id: BusinessVertical;
  name: string;
  icon: string;
  color: string;
  features: string[];
}

export const VERTICAL_CONFIG: Record<BusinessVertical, VerticalConfig> = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant',
    icon: 'UtensilsCrossed',
    color: 'restaurant',
    features: ['table-management', 'kitchen-display', 'menu-builder', 'reservations'],
  },
  hotel: {
    id: 'hotel',
    name: 'Hotel',
    icon: 'Building2',
    color: 'hotel',
    features: ['room-management', 'housekeeping', 'guest-services', 'reservations'],
  },
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacy',
    icon: 'Pill',
    color: 'pharmacy',
    features: ['prescriptions', 'drug-database', 'insurance', 'compliance'],
  },
  retail: {
    id: 'retail',
    name: 'Retail',
    icon: 'ShoppingCart',
    color: 'retail',
    features: ['pos', 'inventory', 'promotions', 'loyalty'],
  },
  property: {
    id: 'property',
    name: 'Property Management',
    icon: 'Building',
    color: 'property',
    features: ['unit-management', 'tenant-screening', 'lease-management', 'rent-collection'],
  },
};
