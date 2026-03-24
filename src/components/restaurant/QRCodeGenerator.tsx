import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Copy, ExternalLink, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeGeneratorProps {
  tableId: string;
  tableNumber: string;
  locationId: string;
  organizationSlug: string;
}

export function QRCodeGenerator({ tableId, tableNumber, locationId, organizationSlug }: QRCodeGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Generate the menu URL for this table
  const menuUrl = `${window.location.origin}/menu/${organizationSlug}/${locationId}?table=${tableId}`;
  
  // Generate QR code using external QR service API
  useEffect(() => {
    if (dialogOpen) {
      generateQRCode(menuUrl);
    }
  }, [dialogOpen, menuUrl]);

  const generateQRCode = async (text: string) => {
    try {
      // Use external QR code service to generate real QR code
      const qrSize = 256;
      const qrServiceUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(text)}`;
      
      // Load the QR code image from the service
      const qrImage = new Image();
      qrImage.crossOrigin = 'anonymous'; // Enable CORS for canvas operations
      
      qrImage.onload = () => {
        // Create canvas to add table label and maintain download functionality
        const canvas = document.createElement('canvas');
        const qrDisplaySize = 200; // Size for display
        const padding = 20;
        const labelHeight = 50;
        
        canvas.width = qrDisplaySize + (padding * 2);
        canvas.height = qrDisplaySize + padding + labelHeight;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // White background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the QR code image (scaled to display size)
          ctx.drawImage(qrImage, padding, padding, qrDisplaySize, qrDisplaySize);
          
          // Add table label
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 14px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`Table ${tableNumber}`, canvas.width / 2, qrDisplaySize + padding + 20);
          ctx.font = '10px system-ui';
          ctx.fillStyle = '#666666';
          ctx.fillText('Scan to view menu & order', canvas.width / 2, qrDisplaySize + padding + 38);
          
          setQrDataUrl(canvas.toDataURL('image/png'));
        }
      };
      
      qrImage.onerror = () => {
        // Fallback: if image fails to load, show error toast
        toast.error("Failed to generate QR code", { description: "Please try again later" });
      };
      
      qrImage.src = qrServiceUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error("Failed to generate QR code", { description: "Please try again later" });
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `table-${tableNumber}-qr.png`;
    link.href = qrDataUrl;
    link.click();
    
    toast.success("QR code downloaded");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    toast.success("Menu link copied to clipboard");
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Table ${tableNumber} QR Code</title>
            <style>
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                min-height: 100vh; 
                margin: 0;
                font-family: system-ui;
              }
              .qr-container {
                text-align: center;
                padding: 40px;
                border: 2px dashed #ccc;
                border-radius: 16px;
              }
              img { max-width: 250px; }
              h2 { margin: 20px 0 5px; }
              p { color: #666; margin: 0; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <img src="${qrDataUrl}" alt="QR Code" />
              <h2>Table ${tableNumber}</h2>
              <p>Scan to view menu & order</p>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code for Table {tableNumber}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* QR Code Display */}
          <Card className="border-dashed">
            <CardContent className="p-6 flex flex-col items-center">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR code for table ${tableNumber}`}
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 bg-muted animate-pulse rounded" />
              )}
              <Badge variant="secondary" className="mt-4">
                Scan to order from table
              </Badge>
            </CardContent>
          </Card>

          {/* Menu URL */}
          <div className="space-y-2">
            <Label>Menu Link</Label>
            <div className="flex gap-2">
              <Input 
                value={menuUrl} 
                readOnly 
                className="text-xs font-mono"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          <Button 
            variant="ghost" 
            className="w-full gap-2"
            onClick={() => window.open(menuUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Preview Customer Menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
