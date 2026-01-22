import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  UtensilsCrossed,
  Pill,
  Store,
  Calendar,
  Receipt,
  Warehouse,
  UserCog,
  ChefHat,
  BedDouble,
  ClipboardList,
  Shield,
  Wrench,
  ConciergeBell,
  UserCheck,
  CreditCard,
  DoorOpen,
  FileText,
  DollarSign,
  AlertTriangle,
  LucideIcon,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LocationSwitcher } from './LocationSwitcher';
import { BusinessVertical } from '@/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  requiredFeature?: string;
}


const getNavItems = (vertical: BusinessVertical, isSuperAdmin: boolean) => {
  const verticalNav: Record<BusinessVertical, { main: NavItem[]; features: NavItem[] }> = {
    restaurant: {
      main: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Point of Sale', href: '/pos', icon: ShoppingCart },
        { title: 'Tables', href: '/tables', icon: UtensilsCrossed },
        { title: 'Kitchen Display', href: '/kitchen', icon: ChefHat, requiredFeature: 'kitchen_display' },
        { title: 'Orders', href: '/orders', icon: Receipt },
      ],
      features: [
        { title: 'Reservations', href: '/reservations', icon: Calendar, requiredFeature: 'reservations' },
        { title: 'Products', href: '/products', icon: Package },
        { title: 'Inventory', href: '/inventory', icon: Warehouse, requiredFeature: 'inventory_management' },
        { title: 'Customers', href: '/customers', icon: Users, requiredFeature: 'customer_management' },
      ],
    },
    hotel: {
      main: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Front Desk', href: '/front-desk', icon: DoorOpen },
        { title: 'Rooms', href: '/rooms', icon: BedDouble },
        { title: 'Reservations', href: '/reservations', icon: Calendar, requiredFeature: 'reservations' },
      ],
      features: [
        { title: 'Housekeeping', href: '/housekeeping', icon: ClipboardList, requiredFeature: 'housekeeping_management' },
        { title: 'Maintenance', href: '/maintenance', icon: Wrench, requiredFeature: 'maintenance_tracking' },
        { title: 'Guest Services', href: '/guest-services', icon: ConciergeBell, requiredFeature: 'guest_services' },
        { title: 'Guest Profiles', href: '/guest-profiles', icon: UserCheck, requiredFeature: 'guest_profiles' },
        { title: 'Billing & Folios', href: '/billing', icon: CreditCard },
      ],
    },
    pharmacy: {
      main: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Prescriptions', href: '/pharmacy/prescriptions', icon: FileText },
        { title: 'Patients', href: '/pharmacy/patients', icon: Users },
        { title: 'Medications', href: '/pharmacy/medications', icon: Pill },
      ],
      features: [
        { title: 'Insurance', href: '/pharmacy/insurance', icon: DollarSign, requiredFeature: 'insurance_billing' },
        { title: 'Controlled Substances', href: '/pharmacy/controlled', icon: Shield, requiredFeature: 'controlled_substances' },
        { title: 'Drug Interactions', href: '/pharmacy/interactions', icon: AlertTriangle, requiredFeature: 'drug_interactions' },
        { title: 'Inventory', href: '/inventory', icon: Warehouse, requiredFeature: 'inventory_management' },
        { title: 'POS', href: '/pos', icon: ShoppingCart },
      ],
    },
    retail: {
      main: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Point of Sale', href: '/pos', icon: ShoppingCart },
        { title: 'Products', href: '/products', icon: Package },
        { title: 'Orders', href: '/orders', icon: Receipt },
      ],
      features: [
        { title: 'Inventory', href: '/inventory', icon: Warehouse, requiredFeature: 'inventory_management' },
        { title: 'Customers', href: '/customers', icon: Users, requiredFeature: 'customer_management' },
      ],
    },
    property: {
      main: [
        { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { title: 'Units', href: '/property/units', icon: Building2 },
        { title: 'Tenants', href: '/property/tenants', icon: Users },
        { title: 'Leases', href: '/property/leases', icon: FileText },
      ],
      features: [
        { title: 'Rent Collection', href: '/property/rent', icon: DollarSign },
        { title: 'Applications', href: '/property/applications', icon: ClipboardList, requiredFeature: 'tenant_screening' },
        { title: 'Maintenance', href: '/property/maintenance', icon: Wrench },
        { title: 'Reports', href: '/property/reports', icon: BarChart3, requiredFeature: 'financial_reports' },
      ],
    },
  };

  const management: NavItem[] = [
    { title: 'Reports', href: '/reports', icon: BarChart3 },
    { title: 'Staff', href: '/staff', icon: UserCog, requiredFeature: 'staff_management' },
    { title: 'Settings', href: '/settings', icon: Settings },
  ];

  // Admin panel link - only visible to super admins
  const adminItems: NavItem[] = isSuperAdmin
    ? [{ title: 'Admin Panel', href: '/admin', icon: Shield }]
    : [];

  const nav = verticalNav[vertical];

  return { common: nav.main, verticalSpecific: nav.features, management, adminItems, isSuperAdmin };
};

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, signOut, hasRole, currentOrganization, currentLocation } = useAuth();
  const { canAccess, isExpired } = useSubscription();

  const isSuperAdmin = hasRole('super_admin');
  const vertical = (currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail') as BusinessVertical;
  const { common, verticalSpecific, management, adminItems } = getNavItems(vertical, isSuperAdmin);

  const isActive = (path: string) => location.pathname === path;
  
  // Check if a nav item is locked based on feature requirement
  const isLocked = (item: NavItem) => {
    if (!item.requiredFeature) return false;
    if (isExpired) return true;
    return !canAccess(item.requiredFeature);
  };

  // Render a nav item (regular or locked)
  const renderNavItem = (item: NavItem) => {
    const locked = isLocked(item);
    
    if (locked) {
      return (
        <SidebarMenuItem key={item.href}>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink
                to="/subscription"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'text-muted-foreground/50 hover:bg-muted/30 cursor-pointer'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.title}</span>
                    <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </>
                )}
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{item.title} - Upgrade to unlock</p>
            </TooltipContent>
          </Tooltip>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive(item.href)
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className={cn('border-r border-border/50', collapsed ? 'w-16' : 'w-64')}>
      <SidebarHeader className="border-b border-border/50 p-2">
        <LocationSwitcher collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {common.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Features</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {verticalSpecific.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Management</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {management.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="text-primary">Platform Admin</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                          location.pathname.startsWith('/admin')
                            ? 'bg-primary text-primary-foreground'
                            : 'text-primary hover:bg-primary/10'
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
