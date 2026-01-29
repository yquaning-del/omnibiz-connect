import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Move, Save, Trash2, RotateCcw, ZoomIn, ZoomOut, 
  Lock, Unlock, Grid3X3, Layers
} from 'lucide-react';

export interface TableItem {
  id: string;
  table_number: string;
  capacity: number;
  status: string;
  position_x: number;
  position_y: number;
  shape: string;
  width?: number;
  height?: number;
  rotation?: number;
  location_id?: string;
  notes?: string | null;
}
interface FloorPlanEditorProps {
  tables: TableItem[];
  onUpdatePositions: (updates: { id: string; position_x: number; position_y: number; rotation?: number }[]) => Promise<void>;
  onTableClick?: (table: TableItem) => void;
  readOnly?: boolean;
}

const statusColors: Record<string, string> = {
  available: 'bg-success/80 border-success',
  occupied: 'bg-destructive/80 border-destructive',
  reserved: 'bg-warning/80 border-warning',
  cleaning: 'bg-info/80 border-info',
};

export function FloorPlanEditor({ 
  tables, 
  onUpdatePositions, 
  onTableClick,
  readOnly = false 
}: FloorPlanEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [localTables, setLocalTables] = useState<TableItem[]>(tables);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isLocked, setIsLocked] = useState(readOnly);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalTables(tables);
  }, [tables]);

  const handleMouseDown = (e: React.MouseEvent, table: TableItem) => {
    if (isLocked) {
      onTableClick?.(table);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragging(table.id);
    setDragOffset({
      x: e.clientX - rect.left - table.position_x * scale,
      y: e.clientY - rect.top - table.position_y * scale,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || isLocked) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const gridSize = 20;
    let newX = (e.clientX - rect.left - dragOffset.x) / scale;
    let newY = (e.clientY - rect.top - dragOffset.y) / scale;

    // Snap to grid
    if (showGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    // Clamp to canvas bounds
    newX = Math.max(0, Math.min(newX, 800 - 80));
    newY = Math.max(0, Math.min(newY, 600 - 80));

    setLocalTables(prev => 
      prev.map(t => 
        t.id === dragging 
          ? { ...t, position_x: newX, position_y: newY }
          : t
      )
    );
    setHasChanges(true);
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = localTables.map(t => ({
        id: t.id,
        position_x: t.position_x,
        position_y: t.position_y,
        rotation: t.rotation,
      }));
      await onUpdatePositions(updates);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save positions:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalTables(tables);
    setHasChanges(false);
  };

  const getTableSize = (table: TableItem) => {
    const baseSize = Math.max(60, 40 + table.capacity * 5);
    return {
      width: table.shape === 'rectangle' ? baseSize * 1.5 : baseSize,
      height: baseSize,
    };
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Floor Plan Editor
        </CardTitle>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowGrid(!showGrid)}
                className={showGrid ? 'bg-primary/10' : ''}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Grid</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
          
          <span className="text-sm text-muted-foreground w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setScale(s => Math.min(1.5, s + 0.1))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setIsLocked(!isLocked)}
                disabled={readOnly}
              >
                {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isLocked ? 'Unlock Editing' : 'Lock Editing'}</TooltipContent>
          </Tooltip>

          {hasChanges && !isLocked && (
            <>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save Layout'}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={canvasRef}
          className={cn(
            "relative w-full h-[600px] rounded-lg border-2 border-dashed border-border overflow-hidden",
            "bg-background transition-all",
            showGrid && "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJ0cmFuc3BhcmVudCI+PC9yZWN0PjxwYXRoIGQ9Ik0gMjAgMCBMIDAgMCAwIDIwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTI4LDEyOCwxMjgsMC4xNSkiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPjwvc3ZnPg==')]",
            dragging && "cursor-grabbing"
          )}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {localTables.map(table => {
            const size = getTableSize(table);
            return (
              <div
                key={table.id}
                className={cn(
                  "absolute flex flex-col items-center justify-center text-white font-semibold",
                  "border-2 shadow-lg transition-shadow select-none",
                  statusColors[table.status] || 'bg-muted border-border',
                  table.shape === 'round' && 'rounded-full',
                  table.shape === 'square' && 'rounded-lg',
                  table.shape === 'rectangle' && 'rounded-lg',
                  !isLocked && 'cursor-grab hover:shadow-xl hover:scale-105',
                  dragging === table.id && 'shadow-2xl scale-110 z-50',
                  isLocked && 'cursor-pointer hover:ring-2 hover:ring-primary'
                )}
                style={{
                  left: table.position_x,
                  top: table.position_y,
                  width: size.width,
                  height: size.height,
                  transform: table.rotation ? `rotate(${table.rotation}deg)` : undefined,
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
              >
                <span className="text-sm font-bold drop-shadow-md">{table.table_number}</span>
                <span className="text-xs opacity-90">{table.capacity} seats</span>
              </div>
            );
          })}

          {localTables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Move className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tables added yet</p>
                <p className="text-sm">Add tables to start designing your floor plan</p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={cn('w-4 h-4 rounded', color.split(' ')[0])} />
              <span className="text-sm text-muted-foreground capitalize">{status}</span>
            </div>
          ))}
        </div>

        {!isLocked && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Move className="h-3 w-3" />
            Drag tables to reposition them. Changes are saved when you click "Save Layout".
          </p>
        )}
      </CardContent>
    </Card>
  );
}
