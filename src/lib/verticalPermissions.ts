import { BusinessVertical, AppRole } from '@/types';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  DollarSign,
  ClipboardList,
  Wrench,
  BarChart3,
  ShoppingCart,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Calendar,
  Package,
  Warehouse,
  DoorOpen,
  BedDouble,
  ConciergeBell,
  UserCheck,
  CreditCard,
  Pill,
  AlertTriangle,
  Shield,
  UserCog,
  Settings,
  LucideIcon,
} from 'lucide-react';

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  route: string;
  category: 'main' | 'features' | 'management';
  defaultRoles: AppRole[];
}

export interface VerticalPermissions {
  vertical: BusinessVertical;
  label: string;
  permissions: PermissionDefinition[];
}

// Property Module Permissions
export const PROPERTY_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'property.dashboard',
    label: 'Dashboard',
    description: 'View property overview and KPIs',
    icon: LayoutDashboard,
    route: '/dashboard',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'property.units',
    label: 'Units',
    description: 'Manage property units and vacancies',
    icon: Building2,
    route: '/property/units',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'property.tenants',
    label: 'Tenants',
    description: 'View and manage tenant profiles',
    icon: Users,
    route: '/property/tenants',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'property.leases',
    label: 'Leases',
    description: 'Create and manage lease agreements',
    icon: FileText,
    route: '/property/leases',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'property.rent_collection',
    label: 'Rent Collection',
    description: 'Track and record rent payments',
    icon: DollarSign,
    route: '/property/rent',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'property.applications',
    label: 'Applications',
    description: 'Review tenant applications',
    icon: ClipboardList,
    route: '/property/applications',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'property.maintenance',
    label: 'Maintenance',
    description: 'Handle maintenance requests',
    icon: Wrench,
    route: '/property/maintenance',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
  {
    key: 'property.reports',
    label: 'Reports',
    description: 'View financial and occupancy reports',
    icon: BarChart3,
    route: '/property/reports',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
];

// Restaurant Module Permissions
export const RESTAURANT_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'restaurant.dashboard',
    label: 'Dashboard',
    description: 'View restaurant overview and KPIs',
    icon: LayoutDashboard,
    route: '/dashboard',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'restaurant.pos',
    label: 'Point of Sale',
    description: 'Process orders and payments',
    icon: ShoppingCart,
    route: '/pos',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'restaurant.tables',
    label: 'Tables',
    description: 'Manage table layouts and status',
    icon: UtensilsCrossed,
    route: '/tables',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'restaurant.kitchen',
    label: 'Kitchen Display',
    description: 'View and manage kitchen orders',
    icon: ChefHat,
    route: '/kitchen',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead'],
  },
  {
    key: 'restaurant.orders',
    label: 'Orders',
    description: 'Track and manage orders',
    icon: Receipt,
    route: '/orders',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'restaurant.reservations',
    label: 'Reservations',
    description: 'Manage table reservations',
    icon: Calendar,
    route: '/reservations',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'restaurant.products',
    label: 'Products',
    description: 'Manage menu items',
    icon: Package,
    route: '/products',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'restaurant.inventory',
    label: 'Inventory',
    description: 'Track stock levels',
    icon: Warehouse,
    route: '/inventory',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'restaurant.customers',
    label: 'Customers',
    description: 'Manage customer profiles',
    icon: Users,
    route: '/customers',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
];

// Hotel Module Permissions
export const HOTEL_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'hotel.dashboard',
    label: 'Dashboard',
    description: 'View hotel overview and KPIs',
    icon: LayoutDashboard,
    route: '/dashboard',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'hotel.front_desk',
    label: 'Front Desk',
    description: 'Handle check-in/check-out',
    icon: DoorOpen,
    route: '/front-desk',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
  {
    key: 'hotel.rooms',
    label: 'Rooms',
    description: 'Manage room inventory',
    icon: BedDouble,
    route: '/rooms',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'hotel.reservations',
    label: 'Reservations',
    description: 'Manage room reservations',
    icon: Calendar,
    route: '/reservations',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
  {
    key: 'hotel.housekeeping',
    label: 'Housekeeping',
    description: 'Manage housekeeping tasks',
    icon: ClipboardList,
    route: '/housekeeping',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'hotel.maintenance',
    label: 'Maintenance',
    description: 'Handle maintenance requests',
    icon: Wrench,
    route: '/maintenance',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'hotel.guest_services',
    label: 'Guest Services',
    description: 'Room service and amenity requests',
    icon: ConciergeBell,
    route: '/guest-services',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
  {
    key: 'hotel.guest_profiles',
    label: 'Guest Profiles',
    description: 'View guest history and preferences',
    icon: UserCheck,
    route: '/guest-profiles',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'hotel.billing',
    label: 'Billing & Folios',
    description: 'Manage guest billing',
    icon: CreditCard,
    route: '/billing',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
];

// Pharmacy Module Permissions
export const PHARMACY_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'pharmacy.dashboard',
    label: 'Dashboard',
    description: 'View pharmacy overview and KPIs',
    icon: LayoutDashboard,
    route: '/dashboard',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'pharmacy.prescriptions',
    label: 'Prescriptions',
    description: 'Process and manage prescriptions',
    icon: FileText,
    route: '/pharmacy/prescriptions',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
  {
    key: 'pharmacy.patients',
    label: 'Patients',
    description: 'Manage patient profiles',
    icon: Users,
    route: '/pharmacy/patients',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
  {
    key: 'pharmacy.medications',
    label: 'Medications',
    description: 'Manage medication database',
    icon: Pill,
    route: '/pharmacy/medications',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'pharmacy.insurance',
    label: 'Insurance',
    description: 'Process insurance claims',
    icon: DollarSign,
    route: '/pharmacy/insurance',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'pharmacy.controlled',
    label: 'Controlled Substances',
    description: 'Manage controlled substance log',
    icon: Shield,
    route: '/pharmacy/controlled',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'pharmacy.interactions',
    label: 'Drug Interactions',
    description: 'Check drug interactions',
    icon: AlertTriangle,
    route: '/pharmacy/interactions',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
  {
    key: 'pharmacy.inventory',
    label: 'Inventory',
    description: 'Track medication stock',
    icon: Warehouse,
    route: '/inventory',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'pharmacy.pos',
    label: 'Point of Sale',
    description: 'Process sales',
    icon: ShoppingCart,
    route: '/pos',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'staff'],
  },
];

// Retail Module Permissions
export const RETAIL_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'retail.dashboard',
    label: 'Dashboard',
    description: 'View retail overview and KPIs',
    icon: LayoutDashboard,
    route: '/dashboard',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'retail.pos',
    label: 'Point of Sale',
    description: 'Process sales and payments',
    icon: ShoppingCart,
    route: '/pos',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'retail.products',
    label: 'Products',
    description: 'Manage product catalog',
    icon: Package,
    route: '/products',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'retail.orders',
    label: 'Orders',
    description: 'Track and manage orders',
    icon: Receipt,
    route: '/orders',
    category: 'main',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager', 'department_lead', 'staff'],
  },
  {
    key: 'retail.inventory',
    label: 'Inventory',
    description: 'Track stock levels',
    icon: Warehouse,
    route: '/inventory',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'retail.customers',
    label: 'Customers',
    description: 'Manage customer profiles',
    icon: Users,
    route: '/customers',
    category: 'features',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
];

// Common Management Permissions (across all verticals)
export const MANAGEMENT_PERMISSIONS: PermissionDefinition[] = [
  {
    key: 'common.reports',
    label: 'Reports',
    description: 'Access analytics and reports',
    icon: BarChart3,
    route: '/reports',
    category: 'management',
    defaultRoles: ['super_admin', 'org_admin', 'location_manager'],
  },
  {
    key: 'common.staff',
    label: 'Staff Management',
    description: 'Manage team members and roles',
    icon: UserCog,
    route: '/staff',
    category: 'management',
    defaultRoles: ['super_admin', 'org_admin'],
  },
  {
    key: 'common.settings',
    label: 'Settings',
    description: 'Configure organization settings',
    icon: Settings,
    route: '/settings',
    category: 'management',
    defaultRoles: ['super_admin', 'org_admin'],
  },
];

// Get permissions for a specific vertical
export function getVerticalPermissions(vertical: BusinessVertical): PermissionDefinition[] {
  switch (vertical) {
    case 'property':
      return PROPERTY_PERMISSIONS;
    case 'restaurant':
      return RESTAURANT_PERMISSIONS;
    case 'hotel':
      return HOTEL_PERMISSIONS;
    case 'pharmacy':
      return PHARMACY_PERMISSIONS;
    case 'retail':
      return RETAIL_PERMISSIONS;
    default:
      return RETAIL_PERMISSIONS;
  }
}

// Get all permissions for a vertical including management
export function getAllPermissionsForVertical(vertical: BusinessVertical): PermissionDefinition[] {
  return [...getVerticalPermissions(vertical), ...MANAGEMENT_PERMISSIONS];
}

// Get default permission keys for a role in a specific vertical
export function getDefaultPermissionsForRole(
  vertical: BusinessVertical,
  role: AppRole
): string[] {
  const allPermissions = getAllPermissionsForVertical(vertical);
  return allPermissions
    .filter((perm) => perm.defaultRoles.includes(role))
    .map((perm) => perm.key);
}

// Get permission key from a route
export function getPermissionKeyFromRoute(
  vertical: BusinessVertical,
  route: string
): string | null {
  const allPermissions = getAllPermissionsForVertical(vertical);
  const permission = allPermissions.find((perm) => perm.route === route);
  return permission?.key || null;
}

// Get vertical label
export function getVerticalLabel(vertical: BusinessVertical): string {
  const labels: Record<BusinessVertical, string> = {
    property: 'Property Management',
    restaurant: 'Restaurant',
    hotel: 'Hotel',
    pharmacy: 'Pharmacy',
    retail: 'Retail',
  };
  return labels[vertical] || 'Retail';
}
