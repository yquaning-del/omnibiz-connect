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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

const getNavItems = (vertical: BusinessVertical) => {
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
      { title: 'Rooms', href: '/rooms', icon: BedDouble },
      { title: 'Housekeeping', href: '/housekeeping', icon: ClipboardList },
      { title: 'Reservations', href: '/reservations', icon: Calendar },
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

  return { common, verticalSpecific: verticalSpecific[vertical], management };
};

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, currentOrganization, currentLocation, signOut } = useAuth();

  const vertical = currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail';
  const { common, verticalSpecific, management } = getNavItems(vertical);
  const VerticalIcon = getVerticalIcon(vertical);
  const verticalConfig = VERTICAL_CONFIG[vertical];

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={cn('border-r border-border/50', collapsed ? 'w-16' : 'w-64')}>
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            `bg-${verticalConfig.color}/20`
          )}>
            <VerticalIcon className={cn('w-5 h-5', `text-${verticalConfig.color}`)} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate">
                {currentOrganization?.name || 'HospitalityOS'}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {currentLocation?.name || verticalConfig.name}
              </span>
            </div>
          )}
        </div>
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
          {!collapsed && <SidebarGroupLabel>{verticalConfig.name}</SidebarGroupLabel>}
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
