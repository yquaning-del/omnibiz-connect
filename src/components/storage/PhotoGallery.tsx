import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { X, ZoomIn, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PhotoGalleryProps {
  photos: string[];
  onPhotosChange?: (photos: string[]) => void;
  editable?: boolean;
  bucket?: string;
  className?: string;
}

export function PhotoGallery({
  photos,
  onPhotosChange,
  editable = false,
  bucket = 'unit-photos',
  className,
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (photoUrl: string) => {
    if (!onPhotosChange) return;
    
    setDeleting(photoUrl);
    
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split(`${bucket}/`);
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        const { error } = await supabase.storage.from(bucket).remove([filePath]);
        if (error) throw error;
      }
      
      onPhotosChange(photos.filter(p => p !== photoUrl));
      toast.success("Photo deleted");
    } catch (error: any) {
      toast.error("Delete failed", { description: error.message });
    } finally {
      setDeleting(null);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No photos uploaded
      </div>
    );
  }

  return (
    <>
      <div className={cn('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3', className)}>
        {photos.map((photo, index) => (
          <div
            key={index}
            className="relative group aspect-square rounded-lg overflow-hidden bg-muted"
          >
            <img
              src={photo}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedPhoto(photo)}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              {editable && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(photo)}
                  disabled={deleting === photo}
                >
                  {deleting === photo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="w-4 h-4" />
          </Button>
          {selectedPhoto && (
            <img
              src={selectedPhoto}
              alt="Full size"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
