import { useEffect } from 'react';
import { ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FieldMapping, ImportConfig } from '@/hooks/useDataImport';

interface FieldMappingStepProps {
  sourceHeaders: string[];
  config: ImportConfig;
  mappings: FieldMapping[];
  onMappingsChange: (mappings: FieldMapping[]) => void;
  sampleData: any[];
}

const FieldMappingStep = ({
  sourceHeaders,
  config,
  mappings,
  onMappingsChange,
  sampleData
}: FieldMappingStepProps) => {
  const allTargetFields = [...config.requiredFields, ...config.optionalFields];

  const updateMapping = (sourceColumn: string, targetField: string) => {
    const existingIndex = mappings.findIndex(m => m.sourceColumn === sourceColumn);
    const newMappings = [...mappings];

    if (targetField === 'skip') {
      // Remove mapping
      if (existingIndex >= 0) {
        newMappings.splice(existingIndex, 1);
      }
    } else {
      // Remove any existing mapping to this target
      const targetIndex = newMappings.findIndex(m => m.targetField === targetField);
      if (targetIndex >= 0) {
        newMappings.splice(targetIndex, 1);
      }

      const mapping: FieldMapping = {
        sourceColumn,
        targetField,
        transform: inferTransform(targetField)
      };

      if (existingIndex >= 0) {
        newMappings[existingIndex] = mapping;
      } else {
        newMappings.push(mapping);
      }
    }

    onMappingsChange(newMappings);
  };

  const inferTransform = (field: string): 'string' | 'number' | 'boolean' | 'array' | 'date' => {
    const numberFields = ['price', 'cost', 'quantity', 'rate', 'points', 'floor', 'capacity', 'threshold', 'tax'];
    const booleanFields = ['requires', 'is_', 'active', 'available'];
    const arrayFields = ['strengths', 'forms', 'warnings', 'allergies', 'conditions', 'amenities', 'names', 'contraindications', 'effects'];
    const dateFields = ['date', 'expiry', 'birth'];

    const lowerField = field.toLowerCase();
    
    if (dateFields.some(f => lowerField.includes(f))) return 'date';
    if (arrayFields.some(f => lowerField.includes(f))) return 'array';
    if (booleanFields.some(f => lowerField.includes(f))) return 'boolean';
    if (numberFields.some(f => lowerField.includes(f))) return 'number';
    
    return 'string';
  };

  const getMappedField = (sourceColumn: string): string => {
    const mapping = mappings.find(m => m.sourceColumn === sourceColumn);
    return mapping?.targetField || 'skip';
  };

  const isMapped = (targetField: string): boolean => {
    return mappings.some(m => m.targetField === targetField);
  };

  const getSampleValue = (sourceColumn: string): string => {
    if (!sampleData.length) return '';
    const value = sampleData[0][sourceColumn];
    if (value === undefined || value === null) return '(empty)';
    return String(value).substring(0, 50);
  };

  const requiredFieldsMapped = config.requiredFields.every(field => isMapped(field));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Map Your Columns</h3>
          <p className="text-sm text-muted-foreground">
            Match your file columns to the system fields
          </p>
        </div>
        <div className="flex items-center gap-2">
          {requiredFieldsMapped ? (
            <Badge variant="default" className="bg-green-500">
              <Check className="h-3 w-3 mr-1" />
              All required fields mapped
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="h-3 w-3 mr-1" />
              Missing required fields
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Required Fields</span>
            <span className="text-muted-foreground font-normal">
              {config.requiredFields.filter(f => isMapped(f)).length}/{config.requiredFields.length} mapped
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {config.requiredFields.map((field) => (
              <Badge
                key={field}
                variant={isMapped(field) ? 'default' : 'outline'}
                className={isMapped(field) ? 'bg-green-500' : 'border-destructive text-destructive'}
              >
                {isMapped(field) && <Check className="h-3 w-3 mr-1" />}
                {field.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {sourceHeaders.map((header) => (
            <Card key={header} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{header}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Sample: {getSampleValue(header)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <Select
                      value={getMappedField(header)}
                      onValueChange={(value) => updateMapping(header, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip this column</SelectItem>
                        <SelectItem value="---" disabled>
                          ── Required ──
                        </SelectItem>
                        {config.requiredFields.map((field) => (
                          <SelectItem
                            key={field}
                            value={field}
                            disabled={isMapped(field) && getMappedField(header) !== field}
                          >
                            {field.replace(/_/g, ' ')}
                            {config.requiredFields.includes(field) && ' *'}
                          </SelectItem>
                        ))}
                        <SelectItem value="---2" disabled>
                          ── Optional ──
                        </SelectItem>
                        {config.optionalFields.map((field) => (
                          <SelectItem
                            key={field}
                            value={field}
                            disabled={isMapped(field) && getMappedField(header) !== field}
                          >
                            {field.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FieldMappingStep;
