import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  color?: 'primary' | 'restaurant' | 'hotel' | 'pharmacy' | 'retail' | 'success' | 'warning';
  onClick?: () => void;
}

export function QuickActionCard({
  title,
  description,
  icon: Icon,
  color = 'primary',
  onClick,
}: QuickActionCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary hover:bg-primary/20',
    restaurant: 'bg-restaurant/10 text-restaurant hover:bg-restaurant/20',
    hotel: 'bg-hotel/10 text-hotel hover:bg-hotel/20',
    pharmacy: 'bg-pharmacy/10 text-pharmacy hover:bg-pharmacy/20',
    retail: 'bg-retail/10 text-retail hover:bg-retail/20',
    success: 'bg-success/10 text-success hover:bg-success/20',
    warning: 'bg-warning/10 text-warning hover:bg-warning/20',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center p-6 rounded-xl border border-border/50',
        'bg-card/50 backdrop-blur transition-all duration-200',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        'active:scale-[0.97] touch-target',
        'group min-h-[120px]'
      )}
    >
      <div className={cn(
        'w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-colors',
        colorClasses[color]
      )}>
        <Icon className="w-7 h-7" />
      </div>
      <span className="font-medium text-foreground text-sm text-center">{title}</span>
      {description && (
        <span className="text-xs text-muted-foreground mt-1 text-center">{description}</span>
      )}
    </button>
  );
}
