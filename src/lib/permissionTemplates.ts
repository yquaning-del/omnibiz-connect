import { BusinessVertical } from '@/types';
import {
  Building2,
  Wrench,
  DollarSign,
  Pill,
  Package,
  ShoppingCart,
  Users,
  BedDouble,
  ConciergeBell,
  ClipboardList,
  UtensilsCrossed,
  ChefHat,
  LucideIcon,
} from 'lucide-react';

export interface PermissionTemplate {
  name: string;
  description: string;
  icon: LucideIcon;
  permissions: string[];
}

// Property Management Templates
export const PROPERTY_TEMPLATES: PermissionTemplate[] = [
  {
    name: 'Leasing Agent',
    description: 'Handle leases, applications, and tenant relations',
    icon: Building2,
    permissions: [
      'property.dashboard',
      'property.units',
      'property.tenants',
      'property.leases',
      'property.applications',
    ],
  },
  {
    name: 'Maintenance Technician',
    description: 'Respond to and complete maintenance requests',
    icon: Wrench,
    permissions: [
      'property.dashboard',
      'property.maintenance',
    ],
  },
  {
    name: 'Collections Agent',
    description: 'Handle rent collection and payment tracking',
    icon: DollarSign,
    permissions: [
      'property.dashboard',
      'property.tenants',
      'property.rent_collection',
    ],
  },
  {
    name: 'Property Manager',
    description: 'Full property management access',
    icon: Building2,
    permissions: [
      'property.dashboard',
      'property.units',
      'property.tenants',
      'property.leases',
      'property.rent_collection',
      'property.applications',
      'property.maintenance',
      'property.reports',
    ],
  },
];

// Restaurant Templates
export const RESTAURANT_TEMPLATES: PermissionTemplate[] = [
  {
    name: 'Cashier',
    description: 'Process orders and payments at POS',
    icon: ShoppingCart,
    permissions: [
      'restaurant.dashboard',
      'restaurant.pos',
      'restaurant.orders',
    ],
  },
  {
    name: 'Server',
    description: 'Manage tables and take orders',
    icon: UtensilsCrossed,
    permissions: [
      'restaurant.dashboard',
      'restaurant.pos',
      'restaurant.tables',
      'restaurant.orders',
    ],
  },
  {
    name: 'Kitchen Staff',
    description: 'View and manage kitchen orders',
    icon: ChefHat,
    permissions: [
      'restaurant.dashboard',
      'restaurant.kitchen',
      'restaurant.orders',
    ],
  },
  {
    name: 'Floor Manager',
    description: 'Manage front-of-house operations',
    icon: Users,
    permissions: [
      'restaurant.dashboard',
      'restaurant.pos',
      'restaurant.tables',
      'restaurant.orders',
      'restaurant.reservations',
      'restaurant.customers',
    ],
  },
];

// Hotel Templates
export const HOTEL_TEMPLATES: PermissionTemplate[] = [
  {
    name: 'Front Desk Agent',
    description: 'Handle check-in/out and reservations',
    icon: BedDouble,
    permissions: [
      'hotel.dashboard',
      'hotel.front_desk',
      'hotel.reservations',
      'hotel.guest_services',
      'hotel.billing',
    ],
  },
  {
    name: 'Concierge',
    description: 'Assist guests with services and requests',
    icon: ConciergeBell,
    permissions: [
      'hotel.dashboard',
      'hotel.guest_services',
      'hotel.guest_profiles',
    ],
  },
  {
    name: 'Housekeeping Supervisor',
    description: 'Manage housekeeping tasks and rooms',
    icon: ClipboardList,
    permissions: [
      'hotel.dashboard',
      'hotel.rooms',
      'hotel.housekeeping',
    ],
  },
  {
    name: 'Night Auditor',
    description: 'Handle overnight operations and billing',
    icon: DollarSign,
    permissions: [
      'hotel.dashboard',
      'hotel.front_desk',
      'hotel.billing',
      'hotel.reservations',
    ],
  },
];

// Pharmacy Templates
export const PHARMACY_TEMPLATES: PermissionTemplate[] = [
  {
    name: 'Pharmacy Technician',
    description: 'Process prescriptions and assist pharmacists',
    icon: Pill,
    permissions: [
      'pharmacy.dashboard',
      'pharmacy.prescriptions',
      'pharmacy.patients',
      'pharmacy.pos',
      'pharmacy.interactions',
    ],
  },
  {
    name: 'Pharmacist',
    description: 'Full prescription and controlled substance access',
    icon: Pill,
    permissions: [
      'pharmacy.dashboard',
      'pharmacy.prescriptions',
      'pharmacy.patients',
      'pharmacy.medications',
      'pharmacy.insurance',
      'pharmacy.controlled',
      'pharmacy.interactions',
      'pharmacy.pos',
    ],
  },
  {
    name: 'Inventory Specialist',
    description: 'Manage medication inventory and stock',
    icon: Package,
    permissions: [
      'pharmacy.dashboard',
      'pharmacy.medications',
      'pharmacy.inventory',
    ],
  },
  {
    name: 'Insurance Coordinator',
    description: 'Process insurance claims and billing',
    icon: DollarSign,
    permissions: [
      'pharmacy.dashboard',
      'pharmacy.patients',
      'pharmacy.insurance',
    ],
  },
];

// Retail Templates
export const RETAIL_TEMPLATES: PermissionTemplate[] = [
  {
    name: 'Cashier',
    description: 'Process sales and handle customer transactions',
    icon: ShoppingCart,
    permissions: [
      'retail.dashboard',
      'retail.pos',
      'retail.orders',
    ],
  },
  {
    name: 'Sales Associate',
    description: 'Assist customers and process sales',
    icon: Users,
    permissions: [
      'retail.dashboard',
      'retail.pos',
      'retail.products',
      'retail.orders',
      'retail.customers',
    ],
  },
  {
    name: 'Stock Clerk',
    description: 'Manage inventory and stock shelves',
    icon: Package,
    permissions: [
      'retail.dashboard',
      'retail.products',
      'retail.inventory',
    ],
  },
  {
    name: 'Store Manager',
    description: 'Full store management access',
    icon: Building2,
    permissions: [
      'retail.dashboard',
      'retail.pos',
      'retail.products',
      'retail.orders',
      'retail.inventory',
      'retail.customers',
      'common.reports',
    ],
  },
];

// Get templates for a specific vertical
export function getTemplatesForVertical(vertical: BusinessVertical): PermissionTemplate[] {
  switch (vertical) {
    case 'property':
      return PROPERTY_TEMPLATES;
    case 'restaurant':
      return RESTAURANT_TEMPLATES;
    case 'hotel':
      return HOTEL_TEMPLATES;
    case 'pharmacy':
      return PHARMACY_TEMPLATES;
    case 'retail':
      return RETAIL_TEMPLATES;
    default:
      return RETAIL_TEMPLATES;
  }
}

// Get a specific template by name
export function getTemplateByName(
  vertical: BusinessVertical,
  templateName: string
): PermissionTemplate | undefined {
  const templates = getTemplatesForVertical(vertical);
  return templates.find((t) => t.name === templateName);
}
