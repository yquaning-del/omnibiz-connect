import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ValidationError, FieldMapping } from '@/hooks/useDataImport';

interface ValidationStepProps {
  data: any[];
  mappings: FieldMapping[];
  errors: ValidationError[];
  totalRecords: number;
}

const ValidationStep = ({ data, mappings, errors, totalRecords }: ValidationStepProps) => {
  const validRecords = totalRecords - new Set(errors.map(e => e.row)).size;
  const errorsByRow = useMemo(() => {
    const grouped: Record<number, ValidationError[]> = {};
    errors.forEach((error) => {
      if (!grouped[error.row]) grouped[error.row] = [];
      grouped[error.row].push(error);
    });
    return grouped;
  }, [errors]);

  const previewData = data.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Review & Validate</h3>
          <p className="text-sm text-muted-foreground">
            Review your data before importing
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRecords}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{validRecords}</p>
                <p className="text-sm text-muted-foreground">Valid Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${errors.length > 0 ? 'bg-destructive/10' : 'bg-green-500/10'}`}>
                {errors.length > 0 ? (
                  <XCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(errorsByRow).length}</p>
                <p className="text-sm text-muted-foreground">Rows with Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Validation Issues Found</AlertTitle>
          <AlertDescription>
            {errors.length} issue{errors.length !== 1 ? 's' : ''} found across {Object.keys(errorsByRow).length} row{Object.keys(errorsByRow).length !== 1 ? 's' : ''}. 
            These rows will be skipped during import.
          </AlertDescription>
        </Alert>
      )}

      {errors.length === 0 && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-700">All Records Valid</AlertTitle>
          <AlertDescription className="text-green-600">
            All {totalRecords} records passed validation and are ready to import.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Preview (First 10 Records)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead className="w-16">Status</TableHead>
                  {mappings.map((mapping) => (
                    <TableHead key={mapping.targetField}>
                      {mapping.targetField.replace(/_/g, ' ')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => {
                  const rowNumber = index + 2;
                  const rowErrors = errorsByRow[rowNumber] || [];
                  const hasError = rowErrors.length > 0;

                  return (
                    <TableRow key={index} className={hasError ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono text-sm">{rowNumber}</TableCell>
                      <TableCell>
                        {hasError ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Valid
                          </Badge>
                        )}
                      </TableCell>
                      {mappings.map((mapping) => {
                        const value = row[mapping.sourceColumn];
                        const fieldError = rowErrors.find(e => e.field === mapping.targetField);
                        
                        return (
                          <TableCell
                            key={mapping.targetField}
                            className={fieldError ? 'text-destructive' : ''}
                          >
                            <div className="flex items-center gap-1">
                              {fieldError && (
                                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                              )}
                              <span className="truncate max-w-[150px]">
                                {value === undefined || value === null || value === ''
                                  ? <span className="text-muted-foreground italic">empty</span>
                                  : String(value)
                                }
                              </span>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Error Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {errors.slice(0, 20).map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-sm p-2 rounded bg-destructive/5"
                  >
                    <Badge variant="outline" className="font-mono">
                      Row {error.row}
                    </Badge>
                    <div>
                      <span className="font-medium">{error.field}:</span>{' '}
                      <span className="text-muted-foreground">{error.message}</span>
                    </div>
                  </div>
                ))}
                {errors.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    ... and {errors.length - 20} more errors
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidationStep;
