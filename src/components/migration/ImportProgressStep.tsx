import { CheckCircle2, XCircle, Loader2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImportProgress } from '@/hooks/useDataImport';

interface ImportProgressStepProps {
  progress: ImportProgress | null;
  isComplete: boolean;
  onDownloadErrors?: () => void;
}

const ImportProgressStep = ({
  progress,
  isComplete,
  onDownloadErrors
}: ImportProgressStepProps) => {
  const percentage = progress
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const downloadErrorReport = () => {
    if (!progress?.errors.length) return;

    let csvContent = 'Row,Field,Error,Value\n';
    progress.errors.forEach((error) => {
      csvContent += `${error.row},"${error.field}","${error.message}","${JSON.stringify(error.value).replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        {isComplete ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold">Import Complete!</h3>
            <p className="text-muted-foreground">
              Your data has been successfully imported
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-xl font-semibold">Importing Data...</h3>
            <p className="text-muted-foreground">
              Please wait while we process your records
            </p>
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{progress?.processed || 0} of {progress?.total || 0} records</span>
            <span>
              {progress?.successful || 0} successful, {progress?.failed || 0} failed
            </span>
          </div>
        </CardContent>
      </Card>

      {isComplete && progress && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-3xl font-bold text-green-700">{progress.successful}</p>
                  <p className="text-sm text-green-600">Records Imported</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={progress.failed > 0 ? "border-destructive/50 bg-destructive/5" : "border-muted"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {progress.failed > 0 ? (
                  <XCircle className="h-8 w-8 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                )}
                <div>
                  <p className={`text-3xl font-bold ${progress.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {progress.failed}
                  </p>
                  <p className={`text-sm ${progress.failed > 0 ? 'text-destructive/80' : 'text-muted-foreground'}`}>
                    Records Failed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isComplete && progress?.errors && progress.errors.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">Failed Records</h4>
              <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Error Report
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {progress.errors.slice(0, 10).map((error, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 text-sm p-2 rounded bg-destructive/5"
                  >
                    <Badge variant="outline" className="font-mono flex-shrink-0">
                      Row {error.row}
                    </Badge>
                    <div className="min-w-0">
                      <span className="font-medium">{error.field}:</span>{' '}
                      <span className="text-muted-foreground">{error.message}</span>
                    </div>
                  </div>
                ))}
                {progress.errors.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    ... and {progress.errors.length - 10} more errors (download report for full list)
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

export default ImportProgressStep;
