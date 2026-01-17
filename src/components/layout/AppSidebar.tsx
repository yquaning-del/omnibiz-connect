import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LocationSwitcher } from './LocationSwitcher';
import { BusinessVertical, VERTICAL_CONFIG } from '@/types';

const getVerticalIcon = (vertical: BusinessVertical) => {
  switch (vertical) {
    case 'restaurant': return UtensilsCrossed;
    case 'hotel': return Building2;
    case 'pharmacy': return Pill;
    case 'retail': return Store;
    default: return Store;
  }
};

// All platform items for super admin view
const getAllPlatformItems = () => [
  { title: 'Tables', href: '/tables', icon: UtensilsCrossed },
  { title: 'Kitchen Display', href: '/kitchen', icon: ChefHat },
  { title: 'Rooms', href: '/rooms', icon: BedDouble },
  { title: 'Housekeeping', href: '/housekeeping', icon: ClipboardList },
  { title: 'Reservations', href: '/reservations', icon: Calendar },
  { title: 'Pharmacy', href: '/pharmacy', icon: Pill },
];

const getNavItems = (vertical: BusinessVertical, isSuperAdmin: boolean) => {
  const common = [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Point of Sale', href: '/pos', icon: ShoppingCart },
    { title: 'Products', href: '/products', icon: Package },
    { title: 'Inventory', href: '/inventory', icon: Warehouse },
    { title: 'Customers', href: '/customers', icon: Users },
    { title: 'Orders', href: '/orders', icon: Receipt },
  ];

  const verticalSpecific: Record<BusinessVertical, typeof common> = {
    restaurant: [
      { title: 'Tables', href: '/tables', icon: UtensilsCrossed },
      { title: 'Kitchen Display', href: '/kitchen', icon: ChefHat },
      { title: 'Reservations', href: '/reservations', icon: Calendar },
    ],
    hotel: [
      { title: 'Front Desk', href: '/front-desk', icon: DoorOpen },
      { title: 'Rooms', href: '/rooms', icon: BedDouble },
      { title: 'Reservations', href: '/reservations', icon: Calendar },
      { title: 'Housekeeping', href: '/housekeeping', icon: ClipboardList },
      { title: 'Maintenance', href: '/maintenance', icon: Wrench },
      { title: 'Guest Services', href: '/guest-services', icon: ConciergeBell },
      { title: 'Guest Profiles', href: '/guest-profiles', icon: UserCheck },
      { title: 'Billing & Folios', href: '/billing', icon: CreditCard },
    ],
    pharmacy: [
      { title: 'Pharmacy', href: '/pharmacy', icon: Pill },
    ],
    retail: [
      { title: 'Promotions', href: '/promotions', icon: Receipt },
    ],
  };

  const management = [
    { title: 'Reports', href: '/reports', icon: BarChart3 },
    { title: 'Staff', href: '/staff', icon: UserCog },
    { title: 'Settings', href: '/settings', icon: Settings },
  ];

  // Super admins see all platform features
  const platformItems = isSuperAdmin ? getAllPlatformItems() : verticalSpecific[vertical];

  return { common, verticalSpecific: platformItems, management, isSuperAdmin };
};

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, signOut, hasRole, currentOrganization, currentLocation } = useAuth();

  const isSuperAdmin = hasRole('super_admin');
  // Use the actual vertical from the current location or organization
  const vertical = (currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail') as BusinessVertical;
  const { common, verticalSpecific, management } = getNavItems(vertical, isSuperAdmin);

  const isActive = (path: string) => location.pathname === path;

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
              {common.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{isSuperAdmin ? 'All Platforms' : 'Features'}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {verticalSpecific.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Management</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {management.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
