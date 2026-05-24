'use client';
import { ClientOnly } from '@/components/client-only';
import { NeedsPrivy } from '@/components/needs-privy';
import { AuthGate } from '@/components/auth-gate';
import { DashboardView } from '@/components/dashboard-view';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-text-dim">Everything in one place — balance, keys, purchases, sales, transactions.</p>
      </header>
      <NeedsPrivy>
        <ClientOnly fallback={<div className="h-40 rounded-lg bg-bg-elevated/40 animate-pulse" />}>
          <AuthGate><DashboardView /></AuthGate>
        </ClientOnly>
      </NeedsPrivy>
    </div>
  );
}
