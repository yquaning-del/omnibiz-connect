import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DollarSign } from 'lucide-react';

interface TipInputProps {
  subtotal: number;
  tipAmount: number;
  onTipChange: (amount: number) => void;
}

const TIP_PRESETS = [10, 15, 18, 20];

export function TipInput({ subtotal, tipAmount, onTipChange }: TipInputProps) {
  const [customTip, setCustomTip] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const handlePresetClick = (percent: number) => {
    const amount = (subtotal * percent) / 100;
    onTipChange(amount);
    setActivePreset(percent);
    setCustomTip('');
  };

  const handleCustomTip = (value: string) => {
    setCustomTip(value);
    setActivePreset(null);
    const amount = parseFloat(value) || 0;
    onTipChange(amount);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          Add Tip
        </span>
        {tipAmount > 0 && (
          <span className="text-primary font-medium">${tipAmount.toFixed(2)}</span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {TIP_PRESETS.map((percent) => (
          <Button
            key={percent}
            type="button"
            variant={activePreset === percent ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(percent)}
            className={cn(
              'text-xs',
              activePreset === percent && 'ring-2 ring-primary/50'
            )}
          >
            {percent}%
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            type="number"
            placeholder="Custom"
            value={customTip}
            onChange={(e) => handleCustomTip(e.target.value)}
            className="pl-7 h-8"
            min="0"
            step="0.01"
          />
        </div>
        {tipAmount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onTipChange(0);
              setActivePreset(null);
              setCustomTip('');
            }}
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
