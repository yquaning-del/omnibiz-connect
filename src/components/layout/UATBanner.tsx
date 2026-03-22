import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';

export function UATBanner() {
  const [dismissed, setDismissed] = useState(false);

  const isUAT =
    import.meta.env.VITE_UAT_MODE === 'true' ||
    import.meta.env.MODE === 'development';

  if (!isUAT || dismissed) return null;

  return (
    <div
      role="banner"
      className="flex items-center justify-between gap-3 px-4 py-2 text-sm bg-amber-500/15 text-amber-700 dark:text-amber-400 border-b border-amber-500/30"
    >
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 shrink-0" />
        <span className="font-medium">UAT Environment</span>
        <span className="hidden sm:inline text-amber-600/80 dark:text-amber-400/70">
          — You are testing with demo data. Actions here do not affect real operations.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-amber-500/20 transition-colors"
        aria-label="Dismiss UAT banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
