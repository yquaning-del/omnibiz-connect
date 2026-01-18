import { useState } from 'react';
import { Upload, FileSpreadsheet, History, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DataImportWizard from '@/components/migration/DataImportWizard';
import ImportHistory from '@/components/migration/ImportHistory';
import ImportTemplates from '@/components/migration/ImportTemplates';
import { useAuth } from '@/contexts/AuthContext';

type ImportType = 'medications' | 'products' | 'customers' | 'patient_profiles' | 'hotel_rooms';

const IMPORT_OPTIONS: {
  id: ImportType;
  name: string;
  description: string;
  icon: typeof FileSpreadsheet;
  verticals: string[];
}[] = [
  {
    id: 'medications',
    name: 'Medications',
    description: 'Import your drug database including dosages, warnings, and pricing',
    icon: FileSpreadsheet,
    verticals: ['pharmacy']
  },
  {
    id: 'products',
    name: 'Products',
    description: 'Import your product catalog with inventory and pricing',
    icon: FileSpreadsheet,
    verticals: ['retail', 'restaurant', 'pharmacy']
  },
  {
    id: 'customers',
    name: 'Customers',
    description: 'Import your customer database with contact information',
    icon: FileSpreadsheet,
    verticals: ['retail', 'restaurant', 'pharmacy', 'hotel']
  },
  {
    id: 'patient_profiles',
    name: 'Patient Profiles',
    description: 'Import patient records with medical and insurance information',
    icon: FileSpreadsheet,
    verticals: ['pharmacy']
  },
  {
    id: 'hotel_rooms',
    name: 'Hotel Rooms',
    description: 'Import room inventory with rates and amenities',
    icon: FileSpreadsheet,
    verticals: ['hotel']
  }
];

const DataImport = () => {
  const { currentLocation } = useAuth();
  const [selectedImportType, setSelectedImportType] = useState<ImportType | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const filteredOptions = IMPORT_OPTIONS.filter(option => 
    !currentLocation?.vertical || option.verticals.includes(currentLocation.vertical)
  );

  const handleStartImport = (type: ImportType) => {
    setSelectedImportType(type);
    setWizardOpen(true);
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setSelectedImportType(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Import</h1>
        <p className="text-muted-foreground">
          Migrate your existing data to the platform
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import" className="gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Download className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Select Data Type to Import</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose what kind of data you want to import. You can download a template first to see the required format.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOptions.map((option) => (
              <Card key={option.id} className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleStartImport(option.id)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <option.icon className="h-6 w-6 text-primary" />
                    </div>
                    <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-lg">{option.name}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Start Import
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredOptions.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No Import Options Available</p>
                <p className="text-sm text-muted-foreground">
                  Select a location to see available import options
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates">
          <ImportTemplates onSelectTemplate={(id) => handleStartImport(id as ImportType)} />
        </TabsContent>

        <TabsContent value="history">
          <ImportHistory />
        </TabsContent>
      </Tabs>

      {selectedImportType && (
        <DataImportWizard
          isOpen={wizardOpen}
          onClose={handleWizardClose}
          importType={selectedImportType}
          onComplete={() => {
            // Refresh data if needed
          }}
        />
      )}
    </div>
  );
};

export default DataImport;
