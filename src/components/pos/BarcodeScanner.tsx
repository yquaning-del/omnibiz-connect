import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScanLine, Camera, X, Flashlight } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setScanning(true);
        startBarcodeDetection();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access.'
          : 'Unable to access camera. Please check your device.'
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  }, [stream]);

  const toggleTorch = async () => {
    if (!stream) return;
    
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
      await track.applyConstraints({
        advanced: [{ torch: !torchEnabled } as any],
      });
      setTorchEnabled(!torchEnabled);
    } else {
      toast.error("Flashlight not available", { description: "Your device does not support flashlight control." });
    }
  };

  const startBarcodeDetection = () => {
    if (!('BarcodeDetector' in window)) {
      // Fallback for browsers without BarcodeDetector API
      toast.success("Barcode scanning limited", { description: "Using manual input mode. Enter barcode manually." });
      return;
    }

    const barcodeDetector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
    });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const barcodes = await barcodeDetector.detect(canvas);
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          onScan(barcode);
          stopCamera();
          onClose();
          toast({
            title: 'Barcode scanned',
            description: `Found: ${barcode}`,
          });
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    }, 200);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative aspect-[4/3] bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4">
              <p className="text-red-400">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-32 border-2 border-primary rounded-lg relative">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary/50 animate-pulse" />
                  <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary opacity-50" />
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={toggleTorch}
                  className="rounded-full"
                >
                  <Flashlight className={torchEnabled ? 'text-yellow-400' : ''} />
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 pt-2">
          <p className="text-sm text-center text-muted-foreground">
            Position the barcode within the frame
          </p>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
