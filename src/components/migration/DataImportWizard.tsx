import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDataImport, ImportConfig } from '@/hooks/useDataImport';
import FileUploadStep from './FileUploadStep';
import FieldMappingStep from './FieldMappingStep';
import ValidationStep from './ValidationStep';
import ImportProgressStep from './ImportProgressStep';

interface DataImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  importType: 'medications' | 'products' | 'customers' | 'patient_profiles' | 'hotel_rooms';
  onComplete?: () => void;
}

type Step = 'upload' | 'mapping' | 'validation' | 'import';

const STEPS: Step[] = ['upload', 'mapping', 'validation', 'import'];

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload File',
  mapping: 'Map Fields',
  validation: 'Validate',
  import: 'Import'
};

const DataImportWizard = ({
  isOpen,
  onClose,
  importType,
  onComplete
}: DataImportWizardProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [isImportComplete, setIsImportComplete] = useState(false);

  const {
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
    getConfig,
    parseFile,
    suggestMappings,
    validateData,
    startImport,
    downloadTemplate
  } = useDataImport();

  const config = getConfig(importType);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!config) return;

    try {
      const { data, headers: fileHeaders } = await parseFile(file);
      setParsedData(data);
      setHeaders(fileHeaders);
      
      // Auto-suggest mappings
      const suggested = suggestMappings(fileHeaders, config);
      setFieldMappings(suggested);
    } catch (error) {
      console.error('Failed to parse file:', error);
    }
  }, [config, parseFile, setParsedData, setHeaders, suggestMappings, setFieldMappings]);

  const handleValidate = useCallback(() => {
    if (!config) return;
    const errors = validateData(parsedData, fieldMappings, config);
    setValidationErrors(errors);
  }, [config, parsedData, fieldMappings, validateData, setValidationErrors]);

  const handleStartImport = useCallback(async () => {
    if (!config) return;
    
    setIsImporting(true);
    const result = await startImport(parsedData, fieldMappings, config);
    setIsImporting(false);
    setIsImportComplete(true);

    if (result && onComplete) {
      onComplete();
    }
  }, [config, parsedData, fieldMappings, startImport, onComplete]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'upload':
        return parsedData.length > 0;
      case 'mapping':
        if (!config) return false;
        return config.requiredFields.every(field =>
          fieldMappings.some(m => m.targetField === field)
        );
      case 'validation':
        return true; // Can proceed even with errors (will skip failed rows)
      case 'import':
        return isImportComplete;
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentIndex + 1];
      
      // Run validation before validation step
      if (nextStep === 'validation') {
        handleValidate();
      }
      
      // Start import when entering import step
      if (nextStep === 'import') {
        handleStartImport();
      }
      
      setCurrentStep(nextStep);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const handleClose = () => {
    // Reset state
    setParsedData([]);
    setHeaders([]);
    setFieldMappings([]);
    setValidationErrors([]);
    setCurrentStep('upload');
    setIsImporting(false);
    setIsImportComplete(false);
    onClose();
  };

  if (!config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Import {importType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4 border-b">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step;
            const isPast = STEPS.indexOf(currentStep) > index;

            return (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isPast
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isPast ? '✓' : index + 1}
                </div>
                <span
                  className={`ml-2 text-sm ${
                    isActive ? 'font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {STEP_LABELS[step]}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      isPast ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {currentStep === 'upload' && (
            <FileUploadStep
              onFileSelect={handleFileSelect}
              onDownloadTemplate={() => downloadTemplate(importType)}
              importType={importType}
            />
          )}

          {currentStep === 'mapping' && (
            <FieldMappingStep
              sourceHeaders={headers}
              config={config}
              mappings={fieldMappings}
              onMappingsChange={setFieldMappings}
              sampleData={parsedData.slice(0, 5)}
            />
          )}

          {currentStep === 'validation' && (
            <ValidationStep
              data={parsedData}
              mappings={fieldMappings}
              errors={validationErrors}
              totalRecords={parsedData.length}
            />
          )}

          {currentStep === 'import' && (
            <ImportProgressStep
              progress={progress}
              isComplete={isImportComplete}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 'upload' ? handleClose : goToPreviousStep}
            disabled={isImporting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 'upload' ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === 'import' ? (
            <Button onClick={handleClose} disabled={!isImportComplete}>
              Close
            </Button>
          ) : (
            <Button onClick={goToNextStep} disabled={!canProceed() || isLoading}>
              {currentStep === 'validation' ? 'Start Import' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataImportWizard;
