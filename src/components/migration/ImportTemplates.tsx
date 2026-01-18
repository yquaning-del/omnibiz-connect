import { Download, FileSpreadsheet, Pill, Package, Users, BedDouble, UserCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDataImport } from '@/hooks/useDataImport';
import { useAuth } from '@/contexts/AuthContext';

const TEMPLATES = [
  {
    id: 'medications',
    name: 'Medications',
    description: 'Import drug database with names, dosages, and warnings',
    icon: Pill,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    verticals: ['pharmacy']
  },
  {
    id: 'products',
    name: 'Products',
    description: 'Import product catalog with prices and inventory',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    verticals: ['retail', 'restaurant', 'pharmacy']
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Import customer database with contact information',
    icon: Users,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    verticals: ['retail', 'restaurant', 'pharmacy', 'hotel']
  },
  {
    id: 'patient_profiles',
    name: 'Patient Profiles',
    description: 'Import patient records with medical information',
    icon: UserCircle,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    verticals: ['pharmacy']
  },
  {
    id: 'hotel_rooms',
    name: 'Hotel Rooms',
    description: 'Import room inventory with rates and amenities',
    icon: BedDouble,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    verticals: ['hotel']
  }
];

interface ImportTemplatesProps {
  onSelectTemplate?: (templateId: string) => void;
}

const ImportTemplates = ({ onSelectTemplate }: ImportTemplatesProps) => {
  const { downloadTemplate } = useDataImport();
  const { currentLocation } = useAuth();

  const filteredTemplates = TEMPLATES.filter(template => 
    !currentLocation?.vertical || template.verticals.includes(currentLocation.vertical)
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Download Templates</h3>
        <p className="text-sm text-muted-foreground">
          Download CSV templates with the correct column headers for each data type
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${template.bgColor}`}>
                  <template.icon className={`h-5 w-5 ${template.color}`} />
                </div>
                <CardTitle className="text-base">{template.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {template.description}
              </CardDescription>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => downloadTemplate(template.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Template
                </Button>
                {onSelectTemplate && (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => onSelectTemplate(template.id)}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ImportTemplates;
