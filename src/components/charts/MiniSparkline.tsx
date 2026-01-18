import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DataPoint {
  value: number;
}

interface MiniSparklineProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  width?: number;
  showTrend?: boolean;
  className?: string;
}

export function MiniSparkline({
  data,
  color = 'hsl(var(--primary))',
  height = 40,
  width = 100,
  showTrend = true,
  className,
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const trend = data[data.length - 1].value - data[0].value;
  const isPositive = trend >= 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              padding: '4px 8px',
              color: 'hsl(var(--foreground))',
            }}
            formatter={(value: number) => [value.toFixed(2), '']}
            labelFormatter={() => ''}
          />
        </LineChart>
      </ResponsiveContainer>
      {showTrend && (
        <div className={cn(
          'flex items-center gap-1 text-sm font-medium',
          isPositive ? 'text-success' : 'text-destructive'
        )}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
        </div>
      )}
    </div>
  );
}
