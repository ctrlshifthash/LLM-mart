'use client';
import { AlertTriangle } from 'lucide-react';

const NEEDS_PRIVY = !process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function SetupBanner() {
  if (!NEEDS_PRIVY) return null;
  return (
    <div className="mb-6 rounded-lg border border-warn/30 bg-warn/5 px-4 py-3 text-xs text-warn flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <strong>Auth not configured.</strong> Paste <code className="font-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> and{' '}
        <code className="font-mono">PRIVY_APP_SECRET</code> into <code className="font-mono">.env.local</code>, then
        restart the dev server. Until then, sign-in and any action that needs your account will not work.
      </div>
    </div>
  );
}
