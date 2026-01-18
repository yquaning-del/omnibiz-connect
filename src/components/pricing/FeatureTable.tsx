import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessVertical } from '@/types';

interface FeatureTableProps {
  vertical: BusinessVertical;
}

const verticalFeatures: Record<BusinessVertical, { feature: string; starter: boolean; professional: boolean; enterprise: boolean }[]> = {
  restaurant: [
    { feature: 'Point of Sale', starter: true, professional: true, enterprise: true },
    { feature: 'Menu Management', starter: true, professional: true, enterprise: true },
    { feature: 'Table Management', starter: true, professional: true, enterprise: true },
    { feature: 'Kitchen Display System', starter: false, professional: true, enterprise: true },
    { feature: 'Reservation System', starter: false, professional: true, enterprise: true },
    { feature: 'Multi-Location Support', starter: false, professional: true, enterprise: true },
    { feature: 'Inventory Management', starter: false, professional: true, enterprise: true },
    { feature: 'Staff Scheduling', starter: false, professional: true, enterprise: true },
    { feature: 'Advanced Analytics', starter: false, professional: false, enterprise: true },
    { feature: 'Custom Integrations', starter: false, professional: false, enterprise: true },
    { feature: 'API Access', starter: false, professional: false, enterprise: true },
    { feature: 'Priority Support', starter: false, professional: false, enterprise: true },
  ],
  hotel: [
    { feature: 'Front Desk Operations', starter: true, professional: true, enterprise: true },
    { feature: 'Room Management', starter: true, professional: true, enterprise: true },
    { feature: 'Guest Check-in/out', starter: true, professional: true, enterprise: true },
    { feature: 'Housekeeping Dashboard', starter: false, professional: true, enterprise: true },
    { feature: 'Maintenance Requests', starter: false, professional: true, enterprise: true },
    { feature: 'Guest Profiles & History', starter: false, professional: true, enterprise: true },
    { feature: 'Revenue Management', starter: false, professional: true, enterprise: true },
    { feature: 'OTA Integration', starter: false, professional: true, enterprise: true },
    { feature: 'Multi-Property Support', starter: false, professional: false, enterprise: true },
    { feature: 'Advanced Reporting', starter: false, professional: false, enterprise: true },
    { feature: 'Custom Integrations', starter: false, professional: false, enterprise: true },
    { feature: 'Dedicated Account Manager', starter: false, professional: false, enterprise: true },
  ],
  pharmacy: [
    { feature: 'Prescription Management', starter: true, professional: true, enterprise: true },
    { feature: 'Patient Profiles', starter: true, professional: true, enterprise: true },
    { feature: 'Medication Database', starter: true, professional: true, enterprise: true },
    { feature: 'Drug Interaction Checking', starter: false, professional: true, enterprise: true },
    { feature: 'Insurance Billing', starter: false, professional: true, enterprise: true },
    { feature: 'Controlled Substance Tracking', starter: false, professional: true, enterprise: true },
    { feature: 'Refill Reminders', starter: false, professional: true, enterprise: true },
    { feature: 'Inventory Management', starter: false, professional: true, enterprise: true },
    { feature: 'Multi-Location Support', starter: false, professional: false, enterprise: true },
    { feature: 'DEA Compliance Reporting', starter: false, professional: false, enterprise: true },
    { feature: 'API Access', starter: false, professional: false, enterprise: true },
    { feature: '24/7 Priority Support', starter: false, professional: false, enterprise: true },
  ],
  retail: [
    { feature: 'Point of Sale', starter: true, professional: true, enterprise: true },
    { feature: 'Product Catalog', starter: true, professional: true, enterprise: true },
    { feature: 'Barcode Scanning', starter: true, professional: true, enterprise: true },
    { feature: 'Inventory Tracking', starter: false, professional: true, enterprise: true },
    { feature: 'Customer Management', starter: false, professional: true, enterprise: true },
    { feature: 'Promotions & Discounts', starter: false, professional: true, enterprise: true },
    { feature: 'Supplier Management', starter: false, professional: true, enterprise: true },
    { feature: 'Purchase Orders', starter: false, professional: true, enterprise: true },
    { feature: 'Multi-Store Support', starter: false, professional: false, enterprise: true },
    { feature: 'Advanced Analytics', starter: false, professional: false, enterprise: true },
    { feature: 'E-commerce Integration', starter: false, professional: false, enterprise: true },
    { feature: 'Custom Integrations', starter: false, professional: false, enterprise: true },
  ],
};

const FeatureTable = React.forwardRef<HTMLDivElement, FeatureTableProps>(
  ({ vertical }, ref) => {
    const features = verticalFeatures[vertical];

    return (
      <div ref={ref} className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-4 px-4 text-left text-foreground font-medium">Feature</th>
              <th className="py-4 px-4 text-center text-foreground font-medium">Starter</th>
              <th className="py-4 px-4 text-center text-foreground font-medium">Professional</th>
              <th className="py-4 px-4 text-center text-foreground font-medium">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {features.map((row, index) => (
              <tr key={index} className={cn('border-b border-border/50', index % 2 === 0 ? 'bg-card/30' : '')}>
                <td className="py-3 px-4 text-foreground">{row.feature}</td>
                <td className="py-3 px-4 text-center">
                  {row.starter ? (
                    <Check className="h-5 w-5 text-success mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.professional ? (
                    <Check className="h-5 w-5 text-success mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.enterprise ? (
                    <Check className="h-5 w-5 text-success mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);
FeatureTable.displayName = 'FeatureTable';

export { FeatureTable };
