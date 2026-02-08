import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  FileText, 
  TestTube, 
  ChevronRight, 
  ArrowLeft,
  Building2,
  UtensilsCrossed,
  Hotel,
  Pill,
  ShoppingCart,
  Users,
  Settings,
  Shield,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const UserManualContent = () => {
  const sections: DocSection[] = [
    {
      id: 'introduction',
      title: 'Introduction',
      icon: <BookOpen className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Welcome to OmniBiz Connect</h3>
          <p className="text-muted-foreground">
            OmniBiz Connect is an enterprise-grade, multi-tenant SaaS platform designed specifically for 
            restaurant, hotel, pharmacy, and retail businesses. Our platform provides comprehensive 
            solutions for point-of-sale, inventory management, customer relations, and business analytics.
          </p>
          <div className="grid gap-3 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Multi-Tenant Architecture</p>
                <p className="text-sm text-muted-foreground">Isolated data and customization per organization</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Role-Based Access Control</p>
                <p className="text-sm text-muted-foreground">Granular permissions for staff members</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Settings className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Real-Time Updates</p>
                <p className="text-sm text-muted-foreground">Live synchronization across all devices</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <ChevronRight className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Quick Start Guide</h3>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li><strong className="text-foreground">Create Account</strong> - Sign up with your email and password</li>
            <li><strong className="text-foreground">Complete Onboarding</strong> - Set up your business name and type</li>
            <li><strong className="text-foreground">Add Location</strong> - Configure your first business location</li>
            <li><strong className="text-foreground">Select Plan</strong> - Choose a subscription tier that fits your needs</li>
            <li><strong className="text-foreground">Start Using</strong> - Access your dashboard and begin operations</li>
          </ol>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-4">
            <p className="text-sm font-medium text-primary">💡 Pro Tip</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the Setup Checklist in your dashboard to ensure you've configured all essential settings.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'restaurant',
      title: 'Restaurant Module',
      icon: <UtensilsCrossed className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Restaurant Operations</h3>
          <p className="text-muted-foreground">
            Manage your restaurant with powerful tools for table management, kitchen display, and reservations.
          </p>
          <div className="space-y-3 mt-4">
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Table Management</p>
              <p className="text-sm text-muted-foreground">Visual floor plan with real-time table status updates</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Kitchen Display System (KDS)</p>
              <p className="text-sm text-muted-foreground">Real-time order display with priority-based queuing</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Reservations</p>
              <p className="text-sm text-muted-foreground">Book tables with guest information and special requests</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'hotel',
      title: 'Hotel Module',
      icon: <Hotel className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Hotel Operations</h3>
          <p className="text-muted-foreground">
            Complete hotel management including front desk, housekeeping, and guest services.
          </p>
          <div className="space-y-3 mt-4">
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Front Desk</p>
              <p className="text-sm text-muted-foreground">Check-in/out, room assignment, and guest verification</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Room Management</p>
              <p className="text-sm text-muted-foreground">Room status, pricing, and availability tracking</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Housekeeping</p>
              <p className="text-sm text-muted-foreground">Task assignment and room cleaning status</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Guest Folios</p>
              <p className="text-sm text-muted-foreground">Charges, payments, and billing management</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'pharmacy',
      title: 'Pharmacy Module',
      icon: <Pill className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pharmacy Operations</h3>
          <p className="text-muted-foreground">
            Specialized tools for prescription management, patient profiles, and controlled substances.
          </p>
          <div className="space-y-3 mt-4">
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Prescription Management</p>
              <p className="text-sm text-muted-foreground">Enter, verify, and dispense prescriptions</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Patient Profiles</p>
              <p className="text-sm text-muted-foreground">Medical history, allergies, and insurance information</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Drug Interactions</p>
              <p className="text-sm text-muted-foreground">Automatic checking for medication conflicts</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Controlled Substances</p>
              <p className="text-sm text-muted-foreground">DEA-compliant logging and inventory tracking</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'retail',
      title: 'Retail Module',
      icon: <ShoppingCart className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Retail Operations</h3>
          <p className="text-muted-foreground">
            Streamlined retail and grocery operations with quick checkout and inventory management.
          </p>
          <div className="space-y-3 mt-4">
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Point of Sale</p>
              <p className="text-sm text-muted-foreground">Fast checkout with barcode scanning support</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Product Catalog</p>
              <p className="text-sm text-muted-foreground">Categories, pricing, and stock management</p>
            </div>
            <div className="p-3 rounded-lg border">
              <p className="font-medium">Inventory Tracking</p>
              <p className="text-sm text-muted-foreground">Low stock alerts and expiry date monitoring</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'subscriptions',
      title: 'Subscription Plans',
      icon: <CreditCard className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Plan Comparison</h3>
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div className="p-4 rounded-lg border">
              <Badge variant="secondary" className="mb-2">Starter</Badge>
              <p className="font-medium">$29/month</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• 1 Location</li>
                <li>• 100 Products</li>
                <li>• Basic POS</li>
                <li>• Email Support</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-primary">
              <Badge className="mb-2">Professional</Badge>
              <p className="font-medium">$79/month</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• 3 Locations</li>
                <li>• 1,000 Products</li>
                <li>• Advanced Features</li>
                <li>• Priority Support</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border">
              <Badge variant="outline" className="mb-2">Enterprise</Badge>
              <p className="font-medium">$199/month</p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Unlimited Locations</li>
                <li>• Unlimited Products</li>
                <li>• All Features</li>
                <li>• Dedicated Support</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState('introduction');

  return (
    <div className="grid md:grid-cols-[250px,1fr] gap-6">
      <div className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              activeSection === section.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            {section.icon}
            {section.title}
          </button>
        ))}
      </div>
      <ScrollArea className="h-[500px] pr-4">
        {sections.find((s) => s.id === activeSection)?.content}
      </ScrollArea>
    </div>
  );
};

const TestingGuideContent = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Test User Credentials</h3>
        <p className="text-muted-foreground mb-4">
          All test users share the same password: <code className="bg-muted px-2 py-1 rounded">Test123!</code>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Email</th>
                <th className="text-left py-2 font-medium">Vertical</th>
                <th className="text-left py-2 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { email: 'restaurant.starter@test.com', vertical: 'Restaurant', tier: 'Starter' },
                { email: 'restaurant.pro@test.com', vertical: 'Restaurant', tier: 'Professional' },
                { email: 'restaurant.enterprise@test.com', vertical: 'Restaurant', tier: 'Enterprise' },
                { email: 'hotel.starter@test.com', vertical: 'Hotel', tier: 'Starter' },
                { email: 'hotel.pro@test.com', vertical: 'Hotel', tier: 'Professional' },
                { email: 'hotel.enterprise@test.com', vertical: 'Hotel', tier: 'Enterprise' },
                { email: 'pharmacy.starter@test.com', vertical: 'Pharmacy', tier: 'Starter' },
                { email: 'pharmacy.pro@test.com', vertical: 'Pharmacy', tier: 'Professional' },
                { email: 'pharmacy.enterprise@test.com', vertical: 'Pharmacy', tier: 'Enterprise' },
                { email: 'retail.starter@test.com', vertical: 'Retail', tier: 'Starter' },
                { email: 'retail.pro@test.com', vertical: 'Retail', tier: 'Professional' },
                { email: 'retail.enterprise@test.com', vertical: 'Retail', tier: 'Enterprise' },
              ].map((user) => (
                <tr key={user.email} className="hover:bg-muted/30">
                  <td className="py-2 font-mono text-xs">{user.email}</td>
                  <td className="py-2">{user.vertical}</td>
                  <td className="py-2">
                    <Badge variant={user.tier === 'Enterprise' ? 'default' : user.tier === 'Professional' ? 'secondary' : 'outline'}>
                      {user.tier}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Role-Based Test Users</h3>
        <div className="grid gap-3">
          {[
            { email: 'pharmacist@test.com', role: 'Pharmacist', access: 'Prescriptions, medications, controlled substances' },
            { email: 'frontdesk@test.com', role: 'Front Desk', access: 'Check-in/out, reservations, guest services' },
            { email: 'manager@test.com', role: 'Manager', access: 'Full access, reports, staff management' },
            { email: 'staff@test.com', role: 'Staff', access: 'POS, orders, basic operations' },
          ].map((user) => (
            <div key={user.email} className="p-3 rounded-lg border">
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono">{user.email}</code>
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{user.access}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Test Scenarios</h3>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="font-medium mb-2">Restaurant Testing</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Create and manage tables</li>
              <li>✓ Process orders through POS</li>
              <li>✓ View Kitchen Display System</li>
              <li>✓ Manage reservations</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="font-medium mb-2">Hotel Testing</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Create room reservations</li>
              <li>✓ Perform check-in/check-out</li>
              <li>✓ Manage housekeeping tasks</li>
              <li>✓ Process guest charges</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-muted/30">
            <p className="font-medium mb-2">Pharmacy Testing</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Enter prescriptions</li>
              <li>✓ Check drug interactions</li>
              <li>✓ Manage patient profiles</li>
              <li>✓ Log controlled substances</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm font-medium text-destructive">⚠️ Important Note</p>
        <p className="text-sm text-muted-foreground mt-1">
          Test users must be created first using the Admin Dashboard → Test Environment → Create Test Users button.
          You must be logged in as a super_admin to access this feature.
        </p>
      </div>
    </div>
  );
};

export default function Documentation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display">Documentation</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive guides and reference documentation for OmniBiz Connect
          </p>
        </div>

        <Tabs defaultValue="user-manual" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="user-manual" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              User Manual
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-2">
              <TestTube className="w-4 h-4" />
              Testing Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user-manual">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  User Manual
                </CardTitle>
                <CardDescription>
                  Complete guide to using OmniBiz Connect features and modules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserManualContent />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5 text-primary" />
                  Testing Guide
                </CardTitle>
                <CardDescription>
                  Test credentials, scenarios, and verification procedures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TestingGuideContent />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Need More Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              If you have questions or need assistance, please contact our support team or use the 
              feedback widget in the bottom-right corner of any page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
