import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, Flame } from 'lucide-react';
import { differenceInMinutes, differenceInSeconds } from 'date-fns';

interface OrderAgingBadgeProps {
  createdAt: string;
  urgentThresholdMinutes?: number;
  criticalThresholdMinutes?: number;
}

export function OrderAgingBadge({
  createdAt,
  urgentThresholdMinutes = 10,
  criticalThresholdMinutes = 15,
}: OrderAgingBadgeProps) {
  const [elapsed, setElapsed] = useState({ minutes: 0, seconds: 0 });
  const [status, setStatus] = useState<'normal' | 'urgent' | 'critical'>('normal');

  useEffect(() => {
    const updateElapsed = () => {
      const now = new Date();
      const created = new Date(createdAt);
      const totalSeconds = differenceInSeconds(now, created);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setElapsed({ minutes, seconds });

      if (minutes >= criticalThresholdMinutes) {
        setStatus('critical');
      } else if (minutes >= urgentThresholdMinutes) {
        setStatus('urgent');
      } else {
        setStatus('normal');
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [createdAt, urgentThresholdMinutes, criticalThresholdMinutes]);

  const formatTime = () => {
    if (elapsed.minutes >= 60) {
      const hours = Math.floor(elapsed.minutes / 60);
      const mins = elapsed.minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${elapsed.minutes}:${elapsed.seconds.toString().padStart(2, '0')}`;
  };

  const Icon = status === 'critical' ? Flame : status === 'urgent' ? AlertTriangle : Clock;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 transition-all',
        status === 'normal' && 'bg-muted/50 text-muted-foreground border-muted',
        status === 'urgent' && 'bg-warning/20 text-warning border-warning/50 animate-pulse',
        status === 'critical' && 'bg-destructive/20 text-destructive border-destructive/50 animate-pulse'
      )}
    >
      <Icon className={cn(
        'w-3 h-3',
        status === 'critical' && 'animate-bounce'
      )} />
      <span className="font-mono text-xs">{formatTime()}</span>
    </Badge>
  );
}
