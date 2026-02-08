import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  Building2,
  Utensils,
  Hotel,
  Pill,
  ShoppingBag,
  Home,
  CheckCircle2,
  Play,
  BarChart3,
  Shield,
  Smartphone,
  Globe,
  Zap,
  Star,
  Users,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react';
import { DemoModal } from '@/components/demo/DemoModal';
import { PublicLayout } from '@/components/layout/PublicLayout';

const verticals = [
  {
    icon: Utensils,
    label: 'Restaurants',
    color: 'text-restaurant',
    bgColor: 'bg-restaurant/10',
    description: 'POS, kitchen display, table management, reservations, QR menus, and online ordering.',
  },
  {
    icon: Hotel,
    label: 'Hotels',
    color: 'text-hotel',
    bgColor: 'bg-hotel/10',
    description: 'Front desk, room management, housekeeping, guest profiles, billing, and night audit.',
  },
  {
    icon: Pill,
    label: 'Pharmacies',
    color: 'text-pharmacy',
    bgColor: 'bg-pharmacy/10',
    description: 'Prescriptions, patient profiles, drug interactions, insurance billing, and controlled substances.',
  },
  {
    icon: ShoppingBag,
    label: 'Retail',
    color: 'text-retail',
    bgColor: 'bg-retail/10',
    description: 'Point of sale, inventory tracking, customer loyalty, online store, and order management.',
  },
  {
    icon: Home,
    label: 'Property',
    color: 'text-property',
    bgColor: 'bg-property/10',
    description: 'Units, tenants, leases, rent collection, applications, maintenance, and tenant portal.',
  },
];

const stats = [
  { value: '5', label: 'Industry Verticals' },
  { value: '50+', label: 'Business Features' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '24/7', label: 'Support Available' },
];

const howItWorks = [
  {
    step: '01',
    icon: Layers,
    title: 'Choose Your Vertical',
    description: 'Select your industry -- restaurant, hotel, pharmacy, retail, or property. We tailor the experience to fit your business.',
  },
  {
    step: '02',
    icon: Zap,
    title: 'Set Up in Minutes',
    description: 'Add your products, configure your settings, invite your team. Our guided onboarding gets you running fast.',
  },
  {
    step: '03',
    icon: TrendingUp,
    title: 'Grow Your Business',
    description: 'Use real-time analytics, AI insights, and automation to optimize operations and increase revenue.',
  },
];

const features = [
  { icon: Smartphone, title: 'Works Anywhere', description: 'Mobile-first PWA with offline support. Use on any device, even without internet.' },
  { icon: BarChart3, title: 'Real-Time Analytics', description: 'Dashboards with live data, trend charts, and AI-powered insights for smarter decisions.' },
  { icon: Shield, title: 'Secure by Default', description: 'Row-level security, JWT verification, encrypted data, and audit logging built in.' },
  { icon: Globe, title: 'Multi-Location', description: 'Manage multiple locations from one account. Each with its own staff, inventory, and settings.' },
  { icon: Users, title: 'Team Management', description: 'Role-based permissions, staff scheduling, and activity tracking for your entire team.' },
  { icon: Clock, title: 'Saves You Time', description: 'Automate repetitive tasks -- rent reminders, refill alerts, kitchen orders, and more.' },
];

const testimonials = [
  {
    name: 'Kwame Asante',
    role: 'Restaurant Owner, Accra',
    quote: 'OmniBiz Connect transformed how we run our restaurant. The kitchen display and POS work seamlessly together.',
    rating: 5,
  },
  {
    name: 'Ama Mensah',
    role: 'Pharmacy Manager, Kumasi',
    quote: 'The prescription management and drug interaction checking have made our workflow so much safer and faster.',
    rating: 5,
  },
  {
    name: 'Kofi Darko',
    role: 'Property Manager, Tema',
    quote: 'Managing 30 units used to be a nightmare. Now rent collection and maintenance tracking are all in one place.',
    rating: 5,
  },
];

const Landing = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <PublicLayout>
      <DemoModal open={demoOpen} onOpenChange={setDemoOpen} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-glow" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              <span>Built for African businesses and beyond</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              <span className="text-foreground">One Platform,</span>
              <br />
              <span className="text-gradient">Every Business</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              OmniBiz Connect is the all-in-one management platform for restaurants, hotels, pharmacies, retail stores, and property managers. Run everything from a single dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2 shadow-glow h-12 px-8 text-base">
                  Start Free 14-Day Trial <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => setDemoOpen(true)} className="gap-2 h-12 px-8 text-base">
                <Play className="w-4 h-4" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-8 border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl md:text-4xl font-display font-bold text-primary">{value}</p>
                <p className="text-sm text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verticals Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Tailored for Your Industry
            </h2>
            <p className="text-muted-foreground text-lg">
              Choose your vertical and get tools purpose-built for your business type.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {verticals.map(({ icon: Icon, label, color, bgColor, description }) => (
              <Card key={label} className="border-border/50 bg-card/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Up and Running in 3 Steps
            </h2>
            <p className="text-muted-foreground text-lg">
              From signup to your first sale in under 10 minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorks.map(({ step, icon: Icon, title, description }) => (
              <div key={step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-2 -left-2 text-6xl font-display font-bold text-primary/10">{step}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground text-lg">
              Powerful tools designed for modern businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 p-5 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Trusted by Business Owners
            </h2>
            <p className="text-muted-foreground text-lg">
              Hear from real people running real businesses.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map(({ name, role, quote, rating }) => (
              <Card key={name} className="border-border/50 bg-card/50">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed mb-4 italic">"{quote}"</p>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{name}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Start your free 14-day trial today. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2 shadow-glow h-12 px-8">
                  Get Started Free <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Landing;
