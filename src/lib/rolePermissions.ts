import { AppRole } from '@/types';

export interface RolePermission {
  label: string;
  description: string;
  features: string[];
  pages: string[];
  level: number;
  color: string;
}

export const ROLE_PERMISSIONS: Record<AppRole, RolePermission> = {
  super_admin: {
    label: 'Super Admin',
    description: 'Full platform access across all organizations',
    features: ['All features', 'Admin Panel', 'Platform Analytics', 'Manage All Organizations'],
    pages: ['All pages', 'Admin Dashboard', 'Organization Management', 'Billing'],
    level: 5,
    color: 'bg-destructive/20 text-destructive border-destructive/30'
  },
  org_admin: {
    label: 'Organization Admin',
    description: 'Full access within organization',
    features: ['All locations', 'Staff management', 'Reports', 'Settings', 'Billing'],
    pages: ['Dashboard', 'Staff', 'Reports', 'Settings', 'All vertical-specific pages'],
    level: 4,
    color: 'bg-primary/20 text-primary border-primary/30'
  },
  location_manager: {
    label: 'Location Manager',
    description: 'Full access at assigned location',
    features: ['Location features', 'Staff scheduling', 'Inventory', 'Reports'],
    pages: ['Dashboard', 'POS', 'Inventory', 'Reports', 'Location-specific pages'],
    level: 3,
    color: 'bg-accent/20 text-accent border-accent/30'
  },
  department_lead: {
    label: 'Department Lead',
    description: 'Manages assigned department',
    features: ['Department oversight', 'Team scheduling', 'View reports'],
    pages: ['Dashboard', 'Department pages', 'Team schedules'],
    level: 2,
    color: 'bg-warning/20 text-warning border-warning/30'
  },
  staff: {
    label: 'Staff',
    description: 'Basic operational access',
    features: ['POS', 'Basic inventory', 'View schedules'],
    pages: ['POS', 'Products', 'Personal schedule'],
    level: 1,
    color: 'bg-muted text-muted-foreground border-muted'
  },
  tenant: {
    label: 'Tenant',
    description: 'Tenant portal access only',
    features: ['View leases', 'Make payments', 'Submit maintenance requests'],
    pages: ['Tenant Dashboard', 'Leases', 'Payments', 'Maintenance'],
    level: 0,
    color: 'bg-secondary/20 text-secondary-foreground border-secondary/30'
  }
};

// Additional vertical-specific roles (not in AppRole enum but used operationally)
export const SPECIALIZED_ROLES: Record<string, RolePermission> = {
  pharmacist: {
    label: 'Pharmacist',
    description: 'Pharmacy-specific access',
    features: ['Prescriptions', 'Patients', 'Medications', 'Controlled substances', 'Insurance'],
    pages: ['Pharmacy Dashboard', 'Prescriptions', 'Patients', 'Medications', 'Interactions'],
    level: 1,
    color: 'bg-pharmacy/20 text-pharmacy border-pharmacy/30'
  },
  front_desk: {
    label: 'Front Desk',
    description: 'Hotel front desk operations',
    features: ['Check-in/out', 'Reservations', 'Guest profiles', 'Room service', 'Billing'],
    pages: ['Front Desk', 'Reservations', 'Rooms', 'Guest Services'],
    level: 1,
    color: 'bg-hotel/20 text-hotel border-hotel/30'
  }
};

// Get roles that a user can assign based on their level
export function getAssignableRoles(userRole: AppRole): AppRole[] {
  const userLevel = ROLE_PERMISSIONS[userRole]?.level || 0;
  
  return (Object.entries(ROLE_PERMISSIONS) as [AppRole, RolePermission][])
    .filter(([_, perm]) => perm.level < userLevel && perm.level > 0)
    .map(([role]) => role);
}

// Check if user can manage another user based on role hierarchy
export function canManageRole(managerRole: AppRole, targetRole: AppRole): boolean {
  const managerLevel = ROLE_PERMISSIONS[managerRole]?.level || 0;
  const targetLevel = ROLE_PERMISSIONS[targetRole]?.level || 0;
  return managerLevel > targetLevel;
}
