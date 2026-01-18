import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataPoint {
  name: string;
  value: number;
  label?: string;
}

interface SalesChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  height?: number;
  showAxis?: boolean;
  valuePrefix?: string;
}

export function SalesChart({
  title,
  data,
  color = 'hsl(var(--primary))',
  icon: Icon,
  className,
  height = 200,
  showAxis = false,
  valuePrefix = '$',
}: SalesChartProps) {
  return (
    <Card className={cn('border-border/50 bg-card/50 backdrop-blur', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            {showAxis && (
              <>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => `${valuePrefix}${value}`}
                />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              formatter={(value: number) => [`${valuePrefix}${value.toFixed(2)}`, 'Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title.replace(/\s/g, '')})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
