import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2, Utensils, Hotel, Pill, ShoppingBag, CheckCircle2 } from 'lucide-react';

const features = [
  { icon: Utensils, label: 'Restaurants', color: 'text-restaurant' },
  { icon: Hotel, label: 'Hotels', color: 'text-hotel' },
  { icon: Pill, label: 'Pharmacies', color: 'text-pharmacy' },
  { icon: ShoppingBag, label: 'Retail', color: 'text-retail' },
];

const benefits = [
  'Unified POS & inventory management',
  'Real-time analytics & reporting',
  'Multi-location support',
  'Staff scheduling & management',
  'Kitchen display system',
  'Housekeeping management',
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-display font-bold text-foreground">HospitalityOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-2">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 gradient-glow" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 leading-tight">
              <span className="text-foreground">All-in-One</span>
              <br />
              <span className="text-gradient">Hospitality Platform</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Streamline your operations with our unified platform for restaurants, hotels, pharmacies, and retail businesses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2 shadow-glow">
                  Start Free Trial <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={() => window.open('https://www.youtube.com/watch?v=demo', '_blank')}>
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Industry Icons */}
          <div className="mt-20 flex flex-wrap justify-center gap-8">
            {features.map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                <Icon className={`h-10 w-10 ${color}`} />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-muted-foreground text-lg">
              Powerful tools designed specifically for hospitality businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border/50">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <span className="text-foreground">{benefit}</span>
              </div>
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
              Join thousands of businesses already using HospitalityOS
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2 shadow-glow">
                Get Started Today <ArrowRight className="h-5 w-5" />
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
};

export default Landing;
