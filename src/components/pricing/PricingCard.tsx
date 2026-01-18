import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  isYearly: boolean;
  features: string[];
  tier: 'starter' | 'professional' | 'enterprise';
  isPopular?: boolean;
  verticalColor: string;
  currencySymbol?: string;
}

export function PricingCard({
  name,
  description,
  priceMonthly,
  priceYearly,
  isYearly,
  features,
  tier,
  isPopular = false,
  verticalColor,
  currencySymbol = '$',
}: PricingCardProps) {
  const price = isYearly ? Math.round(priceYearly / 12) : priceMonthly;
  const yearlyTotal = priceYearly;
  const monthlySavings = isYearly ? Math.round((priceMonthly * 12 - priceYearly) / 12) : 0;

  return (
    <Card
      className={cn(
        'relative flex flex-col transition-all duration-300 hover:scale-[1.02]',
        isPopular
          ? 'border-primary shadow-glow ring-2 ring-primary/20'
          : 'border-border/50 hover:border-primary/50'
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 bg-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-3 w-3" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-display">{name}</CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold font-display">{currencySymbol}{price.toLocaleString()}</span>
            <span className="text-muted-foreground">/mo</span>
          </div>
          {isYearly && (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">
                {currencySymbol}{yearlyTotal.toLocaleString()} billed yearly
              </span>
              <span className="text-sm text-success font-medium">
                Save {currencySymbol}{monthlySavings.toLocaleString()}/mo
              </span>
            </div>
          )}
          {!isYearly && (
            <span className="text-sm text-muted-foreground mt-1 block">
              Billed monthly
            </span>
          )}
        </div>

        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className={cn('h-5 w-5 flex-shrink-0 mt-0.5', verticalColor)} />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-6">
        <Link to="/auth" className="w-full">
          <Button
            className={cn(
              'w-full',
              isPopular ? 'shadow-glow' : ''
            )}
            variant={isPopular ? 'default' : 'outline'}
          >
            {tier === 'enterprise' ? 'Contact Sales' : 'Start Free Trial'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
