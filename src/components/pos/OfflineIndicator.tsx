import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingCount: number;
  failedCount: number;
}

interface OfflineIndicatorProps {
  isOnline: boolean;
  offlineMode: boolean;
  syncStatus: SyncStatus;
  onSync: () => void;
}

export function OfflineIndicator({ 
  isOnline, 
  offlineMode, 
  syncStatus, 
  onSync 
}: OfflineIndicatorProps) {
  const [open, setOpen] = useState(false);

  const getStatusIcon = () => {
    if (syncStatus.isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (!isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }
    if (syncStatus.pendingCount > 0) {
      return <CloudOff className="h-4 w-4" />;
    }
    if (syncStatus.failedCount > 0) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-destructive/20 text-destructive border-destructive/30';
    if (syncStatus.pendingCount > 0 || syncStatus.failedCount > 0) {
      return 'bg-warning/20 text-warning border-warning/30';
    }
    return 'bg-success/20 text-success border-success/30';
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) return 'Syncing...';
    if (!isOnline) return 'Offline';
    if (syncStatus.pendingCount > 0) return `${syncStatus.pendingCount} pending`;
    if (syncStatus.failedCount > 0) return `${syncStatus.failedCount} failed`;
    return 'Online';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            'cursor-pointer transition-all flex items-center gap-1.5 px-2 py-1',
            getStatusColor()
          )}
        >
          {getStatusIcon()}
          <span className="text-xs font-medium">{getStatusText()}</span>
          {syncStatus.pendingCount > 0 && (
            <span className="ml-1 h-5 w-5 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">
              {syncStatus.pendingCount}
            </span>
          )}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Sync Status</h4>
            {isOnline ? (
              <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending orders</span>
              <span className="font-medium">{syncStatus.pendingCount}</span>
            </div>
            {syncStatus.failedCount > 0 && (
              <div className="flex items-center justify-between text-destructive">
                <span>Failed orders</span>
                <span className="font-medium">{syncStatus.failedCount}</span>
              </div>
            )}
            {syncStatus.lastSyncAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last sync</span>
                <span className="font-medium">
                  {syncStatus.lastSyncAt.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {offlineMode && (
            <div className="p-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs">
              <p className="font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Working with cached products
              </p>
              <p className="mt-1 text-warning/80">
                Stock levels may not be accurate until you're back online.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={onSync}
              disabled={!isOnline || syncStatus.isSyncing || syncStatus.pendingCount === 0}
            >
              {syncStatus.isSyncing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Sync Now
            </Button>
          </div>

          {syncStatus.pendingCount === 0 && syncStatus.failedCount === 0 && isOnline && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle2 className="h-4 w-4" />
              All orders synced
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
