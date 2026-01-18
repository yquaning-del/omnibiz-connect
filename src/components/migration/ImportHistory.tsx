import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { History, CheckCircle2, XCircle, Clock, Loader2, Download, Undo } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Migration {
  id: string;
  migration_type: string;
  source_file_name: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  status: string;
  error_log: any[];
  created_at: string;
  completed_at: string | null;
}

const ImportHistory = () => {
  const { currentOrganization } = useAuth();
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchMigrations();
    }
  }, [currentOrganization?.id]);

  const fetchMigrations = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('data_migrations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMigrations((data || []) as Migration[]);
    } catch (error) {
      console.error('Failed to fetch migrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'completed_with_errors':
        return (
          <Badge variant="default" className="bg-yellow-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed with Errors
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  const downloadErrors = (migration: Migration) => {
    if (!migration.error_log?.length) return;

    let csvContent = 'Row,Field,Error,Value\n';
    migration.error_log.forEach((error: any) => {
      csvContent += `${error.row},"${error.field}","${error.message}","${JSON.stringify(error.value).replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${migration.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (migrations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No Import History</p>
          <p className="text-sm text-muted-foreground">
            Your completed imports will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Import History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {migrations.map((migration) => (
                <TableRow key={migration.id}>
                  <TableCell className="font-medium capitalize">
                    {migration.migration_type.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {migration.source_file_name || 'import.csv'}
                  </TableCell>
                  <TableCell>
                    <span className="text-green-600">{migration.processed_records}</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{migration.total_records}</span>
                    {migration.failed_records > 0 && (
                      <span className="text-destructive ml-1">
                        ({migration.failed_records} failed)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(migration.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(migration.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    {migration.error_log?.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadErrors(migration)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ImportHistory;
