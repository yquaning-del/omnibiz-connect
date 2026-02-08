import { useState, useEffect } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, Loader2, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline, syncStatus, requestSync } = useOfflineSync();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Track when we go offline
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setDismissed(false);
    }
  }, [isOnline]);

  // Show "back online" message briefly when reconnecting
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      setWasOffline(false);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Nothing to show: online, no reconnect message, no pending sync
  const hasPending = syncStatus.pendingCount > 0 || syncStatus.failedCount > 0;
  if (isOnline && !showReconnected && !hasPending) return null;
  if (dismissed && isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2 text-sm transition-colors',
        !isOnline && 'bg-destructive/15 text-destructive border-b border-destructive/20',
        isOnline && showReconnected && !hasPending && 'bg-success/15 text-success border-b border-success/20',
        isOnline && hasPending && 'bg-warning/15 text-warning border-b border-warning/20'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isOnline && (
          <>
            <WifiOff className="h-4 w-4 shrink-0" />
            <span className="truncate">
              You are offline. Changes will sync when connectivity is restored.
            </span>
          </>
        )}

        {isOnline && showReconnected && !hasPending && (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="truncate">Back online. All data is up to date.</span>
          </>
        )}

        {isOnline && hasPending && (
          <>
            {syncStatus.isSyncing ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">
              {syncStatus.pendingCount > 0 && `${syncStatus.pendingCount} order(s) pending sync.`}
              {syncStatus.failedCount > 0 && ` ${syncStatus.failedCount} failed.`}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOnline && hasPending && !syncStatus.isSyncing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={requestSync}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Sync Now
          </Button>
        )}

        {isOnline && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
