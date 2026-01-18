import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PricingToggleProps {
  isYearly: boolean;
  onToggle: (yearly: boolean) => void;
}

export function PricingToggle({ isYearly, onToggle }: PricingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        onClick={() => onToggle(false)}
        className={cn(
          'px-4 py-2 rounded-lg font-medium transition-all',
          !isYearly
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Monthly
      </button>
      <button
        onClick={() => onToggle(true)}
        className={cn(
          'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
          isYearly
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Yearly
        <Badge variant="secondary" className="bg-success/20 text-success border-0">
          Save 20%
        </Badge>
      </button>
    </div>
  );
}
