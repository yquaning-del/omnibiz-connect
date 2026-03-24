import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploader } from '@/components/storage/FileUploader';
import { PhotoGallery } from '@/components/storage/PhotoGallery';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UnitPhotosManagerProps {
  unitId: string;
  unitNumber: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export function UnitPhotosManager({
  unitId,
  unitNumber,
  photos,
  onPhotosChange,
}: UnitPhotosManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<string[]>(photos);

  const handleUploadComplete = (urls: string[]) => {
    setLocalPhotos(prev => [...prev, ...urls]);
  };

  const handlePhotosChange = (newPhotos: string[]) => {
    setLocalPhotos(newPhotos);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('property_units')
        .update({ photos: localPhotos })
        .eq('id', unitId);

      if (error) throw error;

      onPhotosChange(localPhotos);
      toast.success("Photos saved");
      setIsOpen(false);
    } catch (error: any) {
      toast.error("Save failed", { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImagePlus className="w-4 h-4 mr-2" />
          Photos ({photos.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Unit {unitNumber} Photos</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="gallery" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          
          <TabsContent value="gallery" className="mt-4">
            <PhotoGallery
              photos={localPhotos}
              onPhotosChange={handlePhotosChange}
              editable
            />
          </TabsContent>
          
          <TabsContent value="upload" className="mt-4">
            <FileUploader
              bucket="unit-photos"
              folder={unitId}
              accept="image/*"
              maxFiles={10}
              maxSizeMB={5}
              onUploadComplete={handleUploadComplete}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
