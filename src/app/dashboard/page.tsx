'use client';
import { ClientOnly } from '@/components/client-only';
import { NeedsPrivy } from '@/components/needs-privy';
import { AuthGate } from '@/components/auth-gate';
import { DashboardView } from '@/components/dashboard-view';
import { Gauge } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="aurora opacity-50" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg-card/60 backdrop-blur px-3 py-1 text-[11px] text-text-dim reveal">
            <Gauge className="h-3 w-3 text-accent" /> Live · refreshes every 5s
          </div>
          <h1 className="reveal reveal-delay-1 mt-5 text-4xl sm:text-6xl font-semibold tracking-tight">
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="reveal reveal-delay-2 mt-3 text-text-dim max-w-2xl">
            Everything in one place — wallet, credits, purchases, sales, transactions.
          </p>
        </header>
        <NeedsPrivy>
          <ClientOnly fallback={<div className="h-40 rounded-2xl glass animate-pulse" />}>
            <AuthGate>
              <div className="reveal reveal-delay-3">
                <DashboardView />
              </div>
            </AuthGate>
          </ClientOnly>
        </NeedsPrivy>
      </div>
    </div>
  );
}
