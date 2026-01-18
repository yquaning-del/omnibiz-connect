import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ImportConfig {
  type: 'medications' | 'products' | 'customers' | 'patient_profiles' | 'hotel_rooms';
  requiredFields: string[];
  optionalFields: string[];
  tableName: string;
}

export interface FieldMapping {
  sourceColumn: string;
  targetField: string;
  transform?: 'string' | 'number' | 'boolean' | 'array' | 'date';
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: any;
}

export interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  errors: ValidationError[];
}

const IMPORT_CONFIGS: Record<string, ImportConfig> = {
  medications: {
    type: 'medications',
    requiredFields: ['name'],
    optionalFields: ['generic_name', 'drug_class', 'strengths', 'dosage_forms', 'route_of_administration', 'controlled_substance_schedule', 'requires_prescription', 'warnings', 'storage_requirements', 'brand_names', 'contraindications', 'side_effects'],
    tableName: 'medications'
  },
  products: {
    type: 'products',
    requiredFields: ['name', 'unit_price'],
    optionalFields: ['sku', 'barcode', 'category', 'subcategory', 'cost_price', 'stock_quantity', 'low_stock_threshold', 'description', 'tax_rate'],
    tableName: 'products'
  },
  customers: {
    type: 'customers',
    requiredFields: ['full_name'],
    optionalFields: ['email', 'phone', 'address', 'notes', 'loyalty_points'],
    tableName: 'customers'
  },
  patient_profiles: {
    type: 'patient_profiles',
    requiredFields: ['full_name'],
    optionalFields: ['date_of_birth', 'gender', 'blood_type', 'allergies', 'medical_conditions', 'insurance_provider', 'insurance_policy_number', 'insurance_group_number', 'emergency_contact_name', 'emergency_contact_phone', 'notes'],
    tableName: 'patient_profiles'
  },
  hotel_rooms: {
    type: 'hotel_rooms',
    requiredFields: ['room_number', 'room_type'],
    optionalFields: ['floor', 'capacity', 'price_per_night', 'base_rate', 'weekend_rate', 'amenities', 'notes', 'status'],
    tableName: 'hotel_rooms'
  }
};

export const useDataImport = () => {
  const { currentOrganization, currentLocation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [migrationId, setMigrationId] = useState<string | null>(null);

  const getConfig = useCallback((type: string): ImportConfig | undefined => {
    return IMPORT_CONFIGS[type];
  }, []);

  const parseFile = useCallback(async (file: File): Promise<{ data: any[]; headers: string[] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({ data: results.data as any[], headers });
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }, []);

  const suggestMappings = useCallback((sourceHeaders: string[], config: ImportConfig): FieldMapping[] => {
    const allTargetFields = [...config.requiredFields, ...config.optionalFields];
    const mappings: FieldMapping[] = [];

    sourceHeaders.forEach((source) => {
      const normalizedSource = source.toLowerCase().replace(/[_\s-]/g, '');
      
      // Find best match
      let bestMatch: string | null = null;
      let bestScore = 0;

      allTargetFields.forEach((target) => {
        const normalizedTarget = target.toLowerCase().replace(/[_\s-]/g, '');
        
        // Exact match
        if (normalizedSource === normalizedTarget) {
          bestMatch = target;
          bestScore = 100;
          return;
        }
        
        // Partial match
        if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
          const score = Math.min(normalizedSource.length, normalizedTarget.length) / Math.max(normalizedSource.length, normalizedTarget.length) * 80;
          if (score > bestScore) {
            bestMatch = target;
            bestScore = score;
          }
        }
      });

      if (bestMatch && bestScore > 50) {
        mappings.push({
          sourceColumn: source,
          targetField: bestMatch,
          transform: inferTransform(bestMatch)
        });
      }
    });

    return mappings;
  }, []);

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

  const validateData = useCallback((data: any[], mappings: FieldMapping[], config: ImportConfig): ValidationError[] => {
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      // Check required fields
      config.requiredFields.forEach((requiredField) => {
        const mapping = mappings.find(m => m.targetField === requiredField);
        if (!mapping) {
          errors.push({
            row: index + 2, // +2 for header row and 1-based indexing
            field: requiredField,
            message: `Required field "${requiredField}" is not mapped`,
            value: null
          });
          return;
        }

        const value = row[mapping.sourceColumn];
        if (value === undefined || value === null || value === '') {
          errors.push({
            row: index + 2,
            field: requiredField,
            message: `Required field "${requiredField}" is empty`,
            value
          });
        }
      });

      // Validate data types
      mappings.forEach((mapping) => {
        const value = row[mapping.sourceColumn];
        if (value === undefined || value === null || value === '') return;

        if (mapping.transform === 'number' && isNaN(Number(value))) {
          errors.push({
            row: index + 2,
            field: mapping.targetField,
            message: `Expected number for "${mapping.targetField}"`,
            value
          });
        }

        if (mapping.transform === 'date') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              row: index + 2,
              field: mapping.targetField,
              message: `Invalid date format for "${mapping.targetField}"`,
              value
            });
          }
        }
      });
    });

    return errors;
  }, []);

  const transformValue = (value: any, transform: string): any => {
    if (value === undefined || value === null || value === '') return null;

    switch (transform) {
      case 'number':
        return Number(value) || 0;
      case 'boolean':
        return ['true', 'yes', '1', 'y'].includes(String(value).toLowerCase());
      case 'array':
        if (Array.isArray(value)) return value;
        return String(value).split(',').map(s => s.trim()).filter(Boolean);
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
      default:
        return String(value).trim();
    }
  };

  const startImport = useCallback(async (
    data: any[],
    mappings: FieldMapping[],
    config: ImportConfig,
    onProgress?: (progress: ImportProgress) => void
  ) => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return null;
    }

    setIsLoading(true);
    const progressState: ImportProgress = {
      total: data.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      // Create migration record
      const { data: migration, error: migrationError } = await supabase
        .from('data_migrations')
        .insert({
          organization_id: currentOrganization.id,
          location_id: currentLocation?.id || null,
          migration_type: config.type,
          source_file_name: 'import.csv',
          total_records: data.length,
          status: 'processing',
          field_mapping: mappings as any,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (migrationError) throw migrationError;
      setMigrationId(migration.id);

      // Process in batches
      const batchSize = 50;
      const importedIds: string[] = [];

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const transformedBatch = batch.map((row, batchIndex) => {
          const transformed: any = {
            organization_id: currentOrganization.id
          };

          // Add location_id for location-specific tables
          if (['hotel_rooms', 'products'].includes(config.tableName) && currentLocation?.id) {
            transformed.location_id = currentLocation.id;
          }

          // Add vertical for products
          if (config.tableName === 'products' && currentLocation?.vertical) {
            transformed.vertical = currentLocation.vertical;
          }

          mappings.forEach((mapping) => {
            const value = row[mapping.sourceColumn];
            transformed[mapping.targetField] = transformValue(value, mapping.transform || 'string');
          });

          return transformed;
        });

        // Handle patient_profiles specially (needs customer first)
        if (config.tableName === 'patient_profiles') {
          for (const record of transformedBatch) {
            try {
              // Create customer first
              const { data: customer, error: customerError } = await supabase
                .from('customers')
                .insert({
                  organization_id: currentOrganization.id,
                  full_name: record.full_name || 'Unknown Patient',
                  email: record.email,
                  phone: record.phone
                })
                .select()
                .single();

              if (customerError) throw customerError;

              // Create patient profile
              delete record.full_name;
              delete record.email;
              delete record.phone;
              
              const { data: patient, error: patientError } = await supabase
                .from('patient_profiles')
                .insert({
                  ...record,
                  customer_id: customer.id
                })
                .select()
                .single();

              if (patientError) throw patientError;
              
              importedIds.push(patient.id);
              progressState.successful++;
            } catch (error: any) {
              progressState.failed++;
              progressState.errors.push({
                row: i + transformedBatch.indexOf(record) + 2,
                field: 'insert',
                message: error.message,
                value: record
              });
            }
            progressState.processed++;
          }
        } else {
        // Batch insert for other tables
          const { data: inserted, error: insertError } = await supabase
            .from(config.tableName as any)
            .insert(transformedBatch)
            .select();

          if (insertError) {
            // Try individual inserts on batch failure
            for (const record of transformedBatch) {
              try {
                const { data: single, error: singleError } = await supabase
                  .from(config.tableName as any)
                  .insert(record)
                  .select()
                  .single();

                if (singleError) throw singleError;
                if (single && typeof single === 'object' && 'id' in (single as object)) {
                  importedIds.push((single as unknown as { id: string }).id);
                }
                progressState.successful++;
              } catch (error: any) {
                progressState.failed++;
                progressState.errors.push({
                  row: i + transformedBatch.indexOf(record) + 2,
                  field: 'insert',
                  message: error.message,
                  value: record
                });
              }
              progressState.processed++;
            }
          } else {
            inserted?.forEach((r: any) => importedIds.push(r.id));
            progressState.successful += inserted?.length || 0;
            progressState.processed += batch.length;
          }
        }

        setProgress({ ...progressState });
        onProgress?.({ ...progressState });
      }

      // Update migration record
      await supabase
        .from('data_migrations')
        .update({
          status: progressState.failed > 0 ? 'completed_with_errors' : 'completed',
          processed_records: progressState.successful,
          failed_records: progressState.failed,
          error_log: progressState.errors as any,
          imported_record_ids: importedIds as any,
          completed_at: new Date().toISOString()
        })
        .eq('id', migration.id);

      toast.success(`Import completed: ${progressState.successful} successful, ${progressState.failed} failed`);
      return progressState;
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization, currentLocation]);

  const generateTemplate = useCallback((type: string): string => {
    const config = IMPORT_CONFIGS[type];
    if (!config) return '';

    const headers = [...config.requiredFields, ...config.optionalFields];
    return headers.join(',') + '\n';
  }, []);

  const downloadTemplate = useCallback((type: string) => {
    const config = IMPORT_CONFIGS[type];
    if (!config) return;

    const headers = [...config.requiredFields, ...config.optionalFields];
    let csvContent = headers.join(',') + '\n';
    
    // Add sample row
    const sampleRow = headers.map(field => {
      if (field === 'name') return 'Sample Name';
      if (field === 'full_name') return 'John Doe';
      if (field === 'room_number') return '101';
      if (field === 'room_type') return 'standard';
      if (field.includes('price') || field.includes('cost') || field.includes('rate')) return '99.99';
      if (field.includes('quantity') || field.includes('floor') || field.includes('capacity')) return '10';
      if (field === 'email') return 'example@email.com';
      if (field === 'phone') return '+1234567890';
      if (field.includes('date')) return '2024-01-01';
      return '';
    });
    csvContent += sampleRow.join(',') + '\n';

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    isLoading,
    parsedData,
    setParsedData,
    headers,
    setHeaders,
    fieldMappings,
    setFieldMappings,
    validationErrors,
    setValidationErrors,
    progress,
    migrationId,
    getConfig,
    parseFile,
    suggestMappings,
    validateData,
    startImport,
    generateTemplate,
    downloadTemplate
  };
};
