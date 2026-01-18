import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  ClipboardList,
  Settings,
  BarChart3,
  Calendar,
  Building,
  Bed,
  UtensilsCrossed,
  Pill,
  Plus,
  Search,
  FileText,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { currentLocation, isSuperAdmin } = useAuth();
  const vertical = currentLocation?.vertical || "retail";

  const runCommand = React.useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  const navigationItems = React.useMemo(() => {
    const common = [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Point of Sale", icon: ShoppingCart, path: "/pos" },
      { label: "Products", icon: Package, path: "/products" },
      { label: "Inventory", icon: ClipboardList, path: "/inventory" },
      { label: "Orders", icon: FileText, path: "/orders" },
      { label: "Customers", icon: Users, path: "/customers" },
      { label: "Reports", icon: BarChart3, path: "/reports" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ];

    const verticalSpecific: Record<string, Array<{ label: string; icon: any; path: string }>> = {
      restaurant: [
        { label: "Tables", icon: UtensilsCrossed, path: "/tables" },
        { label: "Reservations", icon: Calendar, path: "/reservations" },
        { label: "Kitchen Display", icon: UtensilsCrossed, path: "/kitchen" },
      ],
      hotel: [
        { label: "Rooms", icon: Bed, path: "/rooms" },
        { label: "Reservations", icon: Calendar, path: "/reservations" },
        { label: "Front Desk", icon: Building, path: "/front-desk" },
        { label: "Housekeeping", icon: Building, path: "/housekeeping" },
      ],
      pharmacy: [
        { label: "Prescriptions", icon: Pill, path: "/pharmacy/prescriptions" },
        { label: "Patients", icon: Users, path: "/pharmacy/patients" },
        { label: "Medications", icon: Pill, path: "/pharmacy/medications" },
      ],
      retail: [],
    };

    return [...common, ...(verticalSpecific[vertical] || [])];
  }, [vertical]);

  const quickActions = [
    { label: "New Sale", icon: Plus, action: () => navigate("/pos") },
    { label: "Add Product", icon: Plus, action: () => navigate("/products?action=add") },
    { label: "Add Customer", icon: Plus, action: () => navigate("/customers?action=add") },
    { label: "View Reports", icon: BarChart3, action: () => navigate("/reports") },
  ];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.label}
              onSelect={() => runCommand(item.action)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {isSuperAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              <CommandItem onSelect={() => runCommand(() => navigate("/admin"))}>
                <Building className="mr-2 h-4 w-4" />
                <span>Admin Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/admin/organizations"))}>
                <Building className="mr-2 h-4 w-4" />
                <span>Organizations</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => navigate("/admin/users"))}>
                <Users className="mr-2 h-4 w-4" />
                <span>All Users</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        
        <CommandGroup heading="Help">
          <CommandItem onSelect={() => runCommand(() => {})}>
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>?
            </kbd>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
