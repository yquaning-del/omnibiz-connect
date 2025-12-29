import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'text-primary',
  onClick,
}: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full p-5 rounded-xl border border-border/50 bg-card/50 backdrop-blur',
        'text-left transition-all duration-200',
        'hover:bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        'active:scale-[0.98]',
        'group'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground font-display">{value}</p>
          {change && (
            <p className={cn(
              'text-xs font-medium',
              changeType === 'positive' && 'text-success',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground'
            )}>
              {change}
            </p>
          )}
        </div>
        
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          'bg-primary/10 group-hover:bg-primary/20 transition-colors'
        )}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>

      {/* Decorative gradient */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
}
