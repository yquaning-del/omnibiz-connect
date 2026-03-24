import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
import { toast } from 'sonner';
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface FileUploaderProps {
  bucket: 'documents' | 'unit-photos';
  folder?: string;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  onUploadComplete?: (urls: string[]) => void;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  url?: string;
  error?: string;
}

export function FileUploader({
  bucket,
  folder,
  accept = '*',
  maxFiles = 5,
  maxSizeMB = 10,
  onUploadComplete,
  className,
}: FileUploaderProps) {
  const { currentOrganization } = useAuth();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error("File too large", { description: `${file.name} exceeds ${maxSizeMB}MB limit` });
        return false;
      }
      return true;
    }).slice(0, maxFiles - files.length);

    const newFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...newFiles]);
    uploadFiles(newFiles);
  };

  const uploadFiles = async (filesToUpload: UploadingFile[]) => {
    if (!currentOrganization) return;

    const uploadedUrls: string[] = [];

    for (const uploadFile of filesToUpload) {
      const fileIndex = files.findIndex(f => f.file === uploadFile.file);
      
      // Update status to uploading
      setFiles(prev => prev.map((f, i) => 
        f.file === uploadFile.file ? { ...f, status: 'uploading' as const } : f
      ));

      const fileExt = uploadFile.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder 
        ? `${currentOrganization.id}/${folder}/${fileName}`
        : `${currentOrganization.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        setFiles(prev => prev.map(f => 
          f.file === uploadFile.file ? { ...f, status: 'error' as const, error: error.message } : f
        ));
        toast.error("Upload failed", { description: `Failed to upload ${uploadFile.file.name}` });
      } else {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        setFiles(prev => prev.map(f => 
          f.file === uploadFile.file ? { ...f, status: 'complete' as const, progress: 100, url: urlData.publicUrl } : f
        ));
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    if (uploadedUrls.length > 0 && onUploadComplete) {
      onUploadComplete(uploadedUrls);
    }
  };

  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file));
  };

  const isImage = (file: File) => file.type.startsWith('image/');

  return (
    <div className={cn('space-y-4', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          files.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => files.length < maxFiles && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileSelect}
          className="hidden"
          disabled={files.length >= maxFiles}
        />
        <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max {maxSizeMB}MB per file • Up to {maxFiles} files
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadFile, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
            >
              {isImage(uploadFile.file) ? (
                <ImageIcon className="w-8 h-8 text-primary shrink-0" />
              ) : (
                <FileText className="w-8 h-8 text-primary shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {uploadFile.status === 'uploading' && (
                  <Progress value={uploadFile.progress} className="h-1 mt-1" />
                )}
                {uploadFile.status === 'error' && (
                  <p className="text-xs text-destructive">{uploadFile.error}</p>
                )}
              </div>

              <div className="shrink-0">
                {uploadFile.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
                {uploadFile.status === 'complete' && (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                )}
                {(uploadFile.status === 'pending' || uploadFile.status === 'error') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(uploadFile.file);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
