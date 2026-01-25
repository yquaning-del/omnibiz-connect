import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eraser, Pencil, Type } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  signatureData?: string | null;
  disabled?: boolean;
}

export function SignaturePad({ onSignatureChange, signatureData, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas && hasDrawn) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  const generateTypedSignature = () => {
    if (!typedName.trim()) {
      onSignatureChange(null);
      return;
    }

    // Create an offscreen canvas for typed signature
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw typed signature
    ctx.font = 'italic 32px "Brush Script MT", cursive, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);

    onSignatureChange(canvas.toDataURL('image/png'));
  };

  useEffect(() => {
    if (mode === 'type') {
      generateTypedSignature();
    }
  }, [typedName, mode]);

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'draw' | 'type')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw" disabled={disabled}>
            <Pencil className="h-4 w-4 mr-2" />
            Draw
          </TabsTrigger>
          <TabsTrigger value="type" disabled={disabled}>
            <Type className="h-4 w-4 mr-2" />
            Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-3">
          <div className="border rounded-lg bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Sign using your mouse or finger
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCanvas}
              disabled={disabled}
            >
              <Eraser className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="type" className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="typed-signature">Type your full legal name</Label>
            <Input
              id="typed-signature"
              placeholder="John Smith"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              disabled={disabled}
              className="text-lg"
            />
          </div>
          
          {typedName && (
            <div className="border rounded-lg bg-white p-4">
              <p 
                className="text-center text-2xl text-black"
                style={{ fontFamily: '"Brush Script MT", cursive, sans-serif', fontStyle: 'italic' }}
              >
                {typedName}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {signatureData && (
        <div className="rounded-lg border bg-muted/30 p-2">
          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
          <img 
            src={signatureData} 
            alt="Signature preview" 
            className="max-h-16 mx-auto"
          />
        </div>
      )}
    </div>
  );
}
