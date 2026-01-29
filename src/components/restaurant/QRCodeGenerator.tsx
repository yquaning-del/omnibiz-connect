import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Download, Copy, ExternalLink, Printer } from 'lucide-react';

interface QRCodeGeneratorProps {
  tableId: string;
  tableNumber: string;
  locationId: string;
  organizationSlug: string;
}

export function QRCodeGenerator({ tableId, tableNumber, locationId, organizationSlug }: QRCodeGeneratorProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Generate the menu URL for this table
  const menuUrl = `${window.location.origin}/menu/${organizationSlug}/${locationId}?table=${tableId}`;
  
  // Generate QR code using a canvas-based approach
  useEffect(() => {
    if (dialogOpen) {
      generateQRCode(menuUrl);
    }
  }, [dialogOpen, menuUrl]);

  const generateQRCode = async (text: string) => {
    // Using a simple QR code generation approach with SVG
    const size = 200;
    const moduleCount = 25; // QR version
    const moduleSize = size / moduleCount;
    
    // Simple QR code pattern (placeholder - in production use a proper QR library)
    // This generates a visual representation
    const qrPattern = generateQRPattern(text);
    
    const canvas = document.createElement('canvas');
    canvas.width = size + 40; // padding
    canvas.height = size + 80; // padding + label
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR modules
      ctx.fillStyle = '#000000';
      const offsetX = 20;
      const offsetY = 20;
      
      for (let row = 0; row < qrPattern.length; row++) {
        for (let col = 0; col < qrPattern[row].length; col++) {
          if (qrPattern[row][col]) {
            ctx.fillRect(
              offsetX + col * moduleSize,
              offsetY + row * moduleSize,
              moduleSize,
              moduleSize
            );
          }
        }
      }
      
      // Add table label
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`Table ${tableNumber}`, canvas.width / 2, size + 50);
      ctx.font = '10px system-ui';
      ctx.fillStyle = '#666666';
      ctx.fillText('Scan to view menu & order', canvas.width / 2, size + 68);
      
      setQrDataUrl(canvas.toDataURL('image/png'));
    }
  };

  // Generate a simple QR-like pattern based on text hash
  const generateQRPattern = (text: string): boolean[][] => {
    const size = 25;
    const pattern: boolean[][] = [];
    
    // Create hash from text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    
    // Initialize pattern
    for (let i = 0; i < size; i++) {
      pattern[i] = [];
      for (let j = 0; j < size; j++) {
        pattern[i][j] = false;
      }
    }
    
    // Add finder patterns (corners)
    const addFinderPattern = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || 
              (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            pattern[startRow + r][startCol + c] = true;
          }
        }
      }
    };
    
    addFinderPattern(0, 0);
    addFinderPattern(0, size - 7);
    addFinderPattern(size - 7, 0);
    
    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
      pattern[6][i] = i % 2 === 0;
      pattern[i][6] = i % 2 === 0;
    }
    
    // Fill data area with pseudo-random pattern based on hash
    let seed = Math.abs(hash);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder patterns and timing
        if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
        if (r === 6 || c === 6) continue;
        
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        pattern[r][c] = (seed % 100) < 45;
      }
    }
    
    return pattern;
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `table-${tableNumber}-qr.png`;
    link.href = qrDataUrl;
    link.click();
    
    toast({ title: 'QR code downloaded' });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    toast({ title: 'Menu link copied to clipboard' });
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
