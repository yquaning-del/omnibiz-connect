import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricGaugeProps {
  value: number;
  max: number;
  label: string;
  icon?: LucideIcon;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  suffix?: string;
}

export function MetricGauge({
  value,
  max,
  label,
  icon: Icon,
  color = 'hsl(var(--primary))',
  size = 'md',
  showPercentage = true,
  suffix = '',
}: MetricGaugeProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn('relative', sizeClasses[size])}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon && <Icon className="w-5 h-5 mb-1" style={{ color }} />}
          <span className={cn('font-bold', textSizeClasses[size])}>
            {showPercentage ? `${percentage.toFixed(0)}%` : `${value}${suffix}`}
          </span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </div>
  );
}
