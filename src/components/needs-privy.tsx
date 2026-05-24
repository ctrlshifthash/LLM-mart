'use client';
import { AlertTriangle } from 'lucide-react';

const HAS_PRIVY = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function NeedsPrivy({ children }: { children: React.ReactNode }) {
  if (HAS_PRIVY) return <>{children}</>;
  return (
    <div className="rounded-md border border-warn/30 bg-warn/5 p-4 text-xs text-warn flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        This section needs Privy auth. Set <code className="font-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> and{' '}
        <code className="font-mono">PRIVY_APP_SECRET</code> in <code className="font-mono">.env.local</code>, then restart the dev server.
      </div>
    </div>
  );
}
