import { Utensils, Hotel, Pill, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessVertical } from '@/types';

interface VerticalTabsProps {
  activeVertical: BusinessVertical;
  onVerticalChange: (vertical: BusinessVertical) => void;
}

const verticals = [
  { id: 'restaurant' as BusinessVertical, label: 'Restaurant', icon: Utensils, color: 'text-restaurant hover:bg-restaurant/10' },
  { id: 'hotel' as BusinessVertical, label: 'Hotel', icon: Hotel, color: 'text-hotel hover:bg-hotel/10' },
  { id: 'pharmacy' as BusinessVertical, label: 'Pharmacy', icon: Pill, color: 'text-pharmacy hover:bg-pharmacy/10' },
  { id: 'retail' as BusinessVertical, label: 'Retail', icon: ShoppingBag, color: 'text-retail hover:bg-retail/10' },
];

export function VerticalTabs({ activeVertical, onVerticalChange }: VerticalTabsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {verticals.map(({ id, label, icon: Icon, color }) => (
        <button
          key={id}
          onClick={() => onVerticalChange(id)}
          className={cn(
            'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all border',
            activeVertical === id
              ? 'bg-card border-primary text-foreground shadow-glow'
              : 'border-border/50 text-muted-foreground hover:text-foreground ' + color
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </div>
  );
}
