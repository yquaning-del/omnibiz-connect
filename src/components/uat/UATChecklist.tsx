import { useState, useEffect } from 'react';
import { ClipboardList, CheckSquare, Square, ChevronDown, ChevronRight, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const isUAT =
  import.meta.env.VITE_UAT_MODE === 'true' ||
  import.meta.env.MODE === 'development';

interface ChecklistItem {
  id: string;
  label: string;
}

interface ChecklistGroup {
  id: string;
  title: string;
  items: ChecklistItem[];
}

const CHECKLIST_GROUPS: ChecklistGroup[] = [
  {
    id: 'auth',
    title: 'Authentication & Onboarding',
    items: [
      { id: 'auth-signup', label: 'Sign up with a new account' },
      { id: 'auth-signin', label: 'Sign in / sign out successfully' },
      { id: 'auth-forgot', label: 'Forgot password email flow' },
      { id: 'auth-onboarding', label: 'Complete the onboarding wizard' },
    ],
  },
  {
    id: 'restaurant',
    title: 'Restaurant',
    items: [
      { id: 'rest-pos', label: 'Complete a POS transaction with multiple items' },
      { id: 'rest-discount', label: 'Apply a discount to an order' },
      { id: 'rest-table', label: 'Assign and manage a table' },
      { id: 'rest-kitchen', label: 'View and update order in Kitchen Display' },
      { id: 'rest-reservation', label: 'Create a table reservation' },
      { id: 'rest-report', label: 'Generate an end-of-day report' },
    ],
  },
  {
    id: 'hotel',
    title: 'Hotel',
    items: [
      { id: 'hotel-checkin', label: 'Check a guest in to a room' },
      { id: 'hotel-checkout', label: 'Check a guest out and close folio' },
      { id: 'hotel-housekeeping', label: 'Update housekeeping room status' },
      { id: 'hotel-charge', label: 'Add a charge to a guest folio' },
      { id: 'hotel-booking', label: 'Create a new room booking' },
    ],
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    items: [
      { id: 'rx-patient', label: 'Create a patient profile' },
      { id: 'rx-prescription', label: 'Add and process a prescription' },
      { id: 'rx-interaction', label: 'Check for drug interactions' },
      { id: 'rx-insurance', label: 'Process an insurance claim' },
    ],
  },
  {
    id: 'retail',
    title: 'Retail',
    items: [
      { id: 'retail-product', label: 'Add a product with stock level' },
      { id: 'retail-pos', label: 'Complete a POS sale' },
      { id: 'retail-inventory', label: 'Adjust inventory stock level' },
      { id: 'retail-customer', label: 'Create a customer record' },
    ],
  },
  {
    id: 'property',
    title: 'Property Management',
    items: [
      { id: 'prop-unit', label: 'Add a property unit' },
      { id: 'prop-tenant', label: 'Create a tenant record' },
      { id: 'prop-lease', label: 'Generate a lease document' },
      { id: 'prop-rent', label: 'Record a rent payment' },
      { id: 'prop-maintenance', label: 'Log a maintenance request' },
    ],
  },
  {
    id: 'staff',
    title: 'Staff & Permissions',
    items: [
      { id: 'staff-invite', label: 'Invite a staff member (URL generated)' },
      { id: 'staff-role', label: 'Change a staff member\'s role' },
      { id: 'staff-restrict', label: 'Verify a restricted page is blocked for staff' },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    items: [
      { id: 'rpt-dashboard', label: 'Dashboard charts load with no errors' },
      { id: 'rpt-export', label: 'Export a report to CSV' },
      { id: 'rpt-ai', label: 'Ask the AI Copilot a question' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    items: [
      { id: 'set-org', label: 'Update organization settings' },
      { id: 'set-notifications', label: 'Toggle notification preferences' },
      { id: 'set-subscription', label: 'View subscription plan details' },
    ],
  },
];

export function UATChecklist() {
  const [isOpen, setIsOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { user } = useAuth();

  const storageKey = `uat_checklist_${user?.id || 'anon'}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setChecked(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const toggleItem = (id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setCollapsed(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const resetAll = () => {
    setChecked({});
    try { localStorage.removeItem(storageKey); } catch {}
  };

  const totalItems = CHECKLIST_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
  const completedItems = Object.values(checked).filter(Boolean).length;
  const progressPct = Math.round((completedItems / totalItems) * 100);

  if (!isUAT) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-20 left-6 h-14 w-14 rounded-full shadow-lg z-50 bg-amber-500 hover:bg-amber-600 text-white"
          size="icon"
          title="UAT Test Checklist"
        >
          <ClipboardList className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b bg-amber-500/10">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-amber-600" />
            UAT Test Checklist
            <Badge variant="outline" className="ml-auto text-xs">
              {completedItems}/{totalItems}
            </Badge>
          </SheetTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">{progressPct}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={resetAll}
              title="Reset all checks"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3">
            {CHECKLIST_GROUPS.map(group => {
              const groupChecked = group.items.filter(i => checked[i.id]).length;
              const isCollapsed = collapsed[group.id];
              return (
                <div key={group.id} className="space-y-1">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center gap-2 py-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    }
                    <span className="flex-1 text-left">{group.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {groupChecked}/{group.items.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="pl-6 space-y-1">
                      {group.items.map(item => (
                        <button
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-start gap-2.5 py-1.5 text-sm text-left rounded hover:bg-muted/50 px-2 transition-colors"
                        >
                          {checked[item.id]
                            ? <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                            : <Square className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          }
                          <span className={cn(
                            "text-sm leading-snug",
                            checked[item.id] && "line-through text-muted-foreground"
                          )}>
                            {item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="px-4 py-3 border-t text-xs text-muted-foreground">
          Progress is saved locally per session. Use the feedback button to report issues.
        </div>
      </SheetContent>
    </Sheet>
  );
}
