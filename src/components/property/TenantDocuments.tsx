import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileUploader } from '@/components/storage/FileUploader';
import { formatDistanceToNow } from 'date-fns';
import {
import { toast } from 'sonner';
  FileText,
  Download,
  Trash2,
  Plus,
  Loader2,
  FolderOpen,
  FileImage,
  FileCheck,
} from 'lucide-react';

interface TenantDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

interface TenantDocumentsProps {
  tenantId: string;
  tenantName: string;
}

const DOCUMENT_TYPES = [
  { value: 'id', label: 'ID Document', icon: FileCheck },
  { value: 'proof_of_income', label: 'Proof of Income', icon: FileText },
  { value: 'lease_copy', label: 'Lease Copy', icon: FileText },
  { value: 'application', label: 'Application', icon: FileText },
  { value: 'other', label: 'Other', icon: FolderOpen },
];

export function TenantDocuments({ tenantId, tenantName }: TenantDocumentsProps) {
  const { currentOrganization, user } = useAuth();
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('other');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [tenantId]);

  const fetchDocuments = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('tenant_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (urls: string[]) => {
    if (!currentOrganization || !user) return;

    try {
      const docs = urls.map(url => {
        const fileName = url.split('/').pop() || 'document';
        return {
          organization_id: currentOrganization.id,
          tenant_id: tenantId,
          document_type: selectedType,
          file_name: fileName,
          file_path: url,
          uploaded_by: user.id,
        };
      });

      const { error } = await (supabase as any)
        .from('tenant_documents')
        .insert(docs);

      if (error) throw error;

      toast.success("Documents uploaded successfully");
      setIsUploadOpen(false);
      fetchDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message,
      });
    }
  };

  const handleDelete = async (doc: TenantDocument) => {
    setDeleting(doc.id);
    
    try {
      // Delete from storage
      const urlParts = doc.file_path.split('documents/');
      if (urlParts.length > 1) {
        await supabase.storage.from('documents').remove([urlParts[1]]);
      }

      // Delete from database
      const { error } = await (supabase as any)
        .from('tenant_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success("Document deleted");
      fetchDocuments();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message,
      });
    } finally {
      setDeleting(null);
    }
  };

  const getDocIcon = (type: string) => {
    const docType = DOCUMENT_TYPES.find(t => t.value === type);
    const Icon = docType?.icon || FileText;
    return <Icon className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documents</CardTitle>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document for {tenantName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FileUploader
                bucket="documents"
                folder={`tenants/${tenantId}`}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                maxFiles={5}
                maxSizeMB={10}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No documents uploaded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {getDocIcon(doc.document_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    {' • '}
                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(doc.file_path, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(doc)}
                    disabled={deleting === doc.id}
                  >
                    {deleting === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
