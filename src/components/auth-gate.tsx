'use client';
import { usePrivy } from '@privy-io/react-auth';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  if (!ready) {
    return <div className="h-24 rounded-md bg-bg-elevated/40 animate-pulse" />;
  }
  if (!authenticated) {
    return (
      <div className="rounded-md border border-border bg-bg-elevated/40 p-6 text-center">
        <div className="text-sm text-text-dim mb-3">Sign in to use this section.</div>
        <Button onClick={() => login()}>
          <LogIn className="h-4 w-4" /> Sign In
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}
