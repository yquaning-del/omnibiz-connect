import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Building2, ArrowRight, Shield, Clock, Headphones, ArrowLeft } from 'lucide-react';
import { BusinessVertical } from '@/types';
import { PricingCard } from '@/components/pricing/PricingCard';
import { PricingToggle } from '@/components/pricing/PricingToggle';
import { VerticalTabs } from '@/components/pricing/VerticalTabs';
import { FeatureTable } from '@/components/pricing/FeatureTable';
import { PricingFAQ } from '@/components/pricing/PricingFAQ';
import { CountrySelector, Country, SUPPORTED_COUNTRIES } from '@/components/payment/CountrySelector';

type PlanData = {
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  priceMonthlyGHS: number;
  priceYearlyGHS: number;
  features: string[];
  tier: 'starter' | 'professional' | 'enterprise';
  isPopular?: boolean;
};

const pricingData: Record<BusinessVertical, PlanData[]> = {
  restaurant: [
    {
      name: 'Starter',
      description: 'Perfect for small cafes and food trucks',
      priceMonthly: 49,
      priceYearly: 470,
      priceMonthlyGHS: 750,
      priceYearlyGHS: 7200,
      tier: 'starter',
      features: [
        'Point of Sale system',
        'Menu management',
        'Table management',
        'Basic reporting',
        'Email support',
        '1 location',
        '2 staff accounts',
      ],
    },
    {
      name: 'Professional',
      description: 'For growing restaurants and chains',
      priceMonthly: 99,
      priceYearly: 950,
      priceMonthlyGHS: 1500,
      priceYearlyGHS: 14400,
      tier: 'professional',
      isPopular: true,
      features: [
        'Everything in Starter',
        'Kitchen Display System',
        'Reservation system',
        'Inventory management',
        'Staff scheduling',
        'Up to 3 locations',
        'Unlimited staff',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      description: 'For large restaurant groups',
      priceMonthly: 199,
      priceYearly: 1910,
      priceMonthlyGHS: 3000,
      priceYearlyGHS: 28800,
      tier: 'enterprise',
      features: [
        'Everything in Professional',
        'Unlimited locations',
        'Advanced analytics',
        'Custom integrations',
        'API access',
        'Dedicated account manager',
        '24/7 phone support',
        'Custom training',
      ],
    },
  ],
  hotel: [
    {
      name: 'Starter',
      description: 'For boutique hotels and B&Bs',
      priceMonthly: 79,
      priceYearly: 758,
      priceMonthlyGHS: 1200,
      priceYearlyGHS: 11520,
      tier: 'starter',
      features: [
        'Front desk operations',
        'Room management',
        'Guest check-in/out',
        'Basic reporting',
        'Email support',
        '1 property',
        '50 rooms max',
      ],
    },
    {
      name: 'Professional',
      description: 'For mid-size hotels',
      priceMonthly: 149,
      priceYearly: 1430,
      priceMonthlyGHS: 2250,
      priceYearlyGHS: 21600,
      tier: 'professional',
      isPopular: true,
      features: [
        'Everything in Starter',
        'Housekeeping dashboard',
        'Maintenance requests',
        'Guest profiles & history',
        'Revenue management',
        'OTA integration',
        'Unlimited rooms',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      description: 'For hotel chains and resorts',
      priceMonthly: 299,
      priceYearly: 2870,
      priceMonthlyGHS: 4500,
      priceYearlyGHS: 43200,
      tier: 'enterprise',
      features: [
        'Everything in Professional',
        'Multi-property support',
        'Advanced reporting',
        'Custom integrations',
        'Channel manager',
        'Dedicated account manager',
        '24/7 phone support',
        'On-site training',
      ],
    },
  ],
  pharmacy: [
    {
      name: 'Starter',
      description: 'For independent pharmacies',
      priceMonthly: 99,
      priceYearly: 950,
      priceMonthlyGHS: 1500,
      priceYearlyGHS: 14400,
      tier: 'starter',
      features: [
        'Prescription management',
        'Patient profiles',
        'Medication database',
        'Basic reporting',
        'Email support',
        '1 location',
        '3 pharmacist accounts',
      ],
    },
    {
      name: 'Professional',
      description: 'For growing pharmacy operations',
      priceMonthly: 199,
      priceYearly: 1910,
      priceMonthlyGHS: 3000,
      priceYearlyGHS: 28800,
      tier: 'professional',
      isPopular: true,
      features: [
        'Everything in Starter',
        'Drug interaction checking',
        'Insurance billing',
        'Controlled substance tracking',
        'Refill reminders',
        'Inventory management',
        'Unlimited pharmacists',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      description: 'For pharmacy chains',
      priceMonthly: 399,
      priceYearly: 3830,
      priceMonthlyGHS: 6000,
      priceYearlyGHS: 57600,
      tier: 'enterprise',
      features: [
        'Everything in Professional',
        'Multi-location support',
        'DEA compliance reporting',
        'API access',
        'Custom integrations',
        'Dedicated account manager',
        '24/7 priority support',
        'Compliance training',
      ],
    },
  ],
  retail: [
    {
      name: 'Starter',
      description: 'For small retail shops',
      priceMonthly: 39,
      priceYearly: 374,
      priceMonthlyGHS: 600,
      priceYearlyGHS: 5760,
      tier: 'starter',
      features: [
        'Point of Sale system',
        'Product catalog',
        'Barcode scanning',
        'Basic reporting',
        'Email support',
        '1 location',
        '2 staff accounts',
      ],
    },
    {
      name: 'Professional',
      description: 'For growing retail businesses',
      priceMonthly: 79,
      priceYearly: 758,
      priceMonthlyGHS: 1200,
      priceYearlyGHS: 11520,
      tier: 'professional',
      isPopular: true,
      features: [
        'Everything in Starter',
        'Inventory tracking',
        'Customer management',
        'Promotions & discounts',
        'Supplier management',
        'Purchase orders',
        'Unlimited staff',
        'Priority support',
      ],
    },
    {
      name: 'Enterprise',
      description: 'For retail chains',
      priceMonthly: 149,
      priceYearly: 1430,
      priceMonthlyGHS: 2250,
      priceYearlyGHS: 21600,
      tier: 'enterprise',
      features: [
        'Everything in Professional',
        'Multi-store support',
        'Advanced analytics',
        'E-commerce integration',
        'Custom integrations',
        'Dedicated account manager',
        '24/7 phone support',
        'Custom training',
      ],
    },
  ],
};

const verticalColors: Record<BusinessVertical, string> = {
  restaurant: 'text-restaurant',
  hotel: 'text-hotel',
  pharmacy: 'text-pharmacy',
  retail: 'text-retail',
};

const trustBadges = [
  { icon: Shield, label: 'Bank-level Security', description: 'SOC 2 Compliant' },
  { icon: Clock, label: '99.9% Uptime', description: 'Enterprise reliability' },
  { icon: Headphones, label: 'Expert Support', description: 'Real humans, real help' },
];

export default function Pricing() {
  const [activeVertical, setActiveVertical] = useState<BusinessVertical>('restaurant');
  const [isYearly, setIsYearly] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(SUPPORTED_COUNTRIES[0]);

  useEffect(() => {
    const saved = localStorage.getItem("selectedCountry");
    if (saved) {
      const country = SUPPORTED_COUNTRIES.find((c) => c.code === saved);
      if (country) {
        setSelectedCountry(country);
      }
    }
  }, []);

  const plans = pricingData[activeVertical];
  const verticalColor = verticalColors[activeVertical];
  const isGhana = selectedCountry.code === "GH";
  const currencySymbol = selectedCountry.symbol;
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-display font-bold text-foreground">HospitalityOS</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 gradient-glow" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-4">
              <span className="text-foreground">Simple, Transparent</span>
              <br />
              <span className="text-gradient">Pricing</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your business. Start free, upgrade anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Vertical Selector */}
      <section className="pb-8">
        <div className="container mx-auto px-6">
          <VerticalTabs activeVertical={activeVertical} onVerticalChange={setActiveVertical} />
        </div>
      </section>

      {/* Billing Toggle & Currency Selector */}
      <section className="pb-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PricingToggle isYearly={isYearly} onToggle={setIsYearly} />
            <CountrySelector value={selectedCountry.code} onChange={setSelectedCountry} />
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <PricingCard
                key={plan.name}
                name={plan.name}
                description={plan.description}
                priceMonthly={isGhana ? plan.priceMonthlyGHS : plan.priceMonthly}
                priceYearly={isGhana ? plan.priceYearlyGHS : plan.priceYearly}
                isYearly={isYearly}
                features={plan.features}
                tier={plan.tier}
                isPopular={plan.isPopular}
                verticalColor={verticalColor}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {trustBadges.map(({ icon: Icon, label, description }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-4">
              Compare Features
            </h2>
            <p className="text-muted-foreground text-center mb-12">
              See exactly what's included in each plan
            </p>
            <Card className="p-6 border-border/50">
              <FeatureTable vertical={activeVertical} />
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-foreground text-center mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-center mb-12">
              Got questions? We've got answers.
            </p>
            <PricingFAQ />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 shadow-glow">
                Start Free Trial <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>© 2024 HospitalityOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
