'use client';
import { useEffect, useState } from 'react';
import { BRAND_LOGO_URL } from '@/lib/brand';

const SESSION_KEY = 'llmart-splash-shown';
const MIN_DURATION = 1900;

export function SplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;
    let shown = false;
    try { shown = sessionStorage.getItem(SESSION_KEY) === '1'; } catch { /* ignore */ }
    if (shown) return;
    setActive(true);
    const start = Date.now();
    const finish = () => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_DURATION - elapsed);
      setTimeout(() => {
        setFadingOut(true);
        setTimeout(() => {
          setActive(false);
          try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
        }, 600);
      }, wait);
    };
    if (document.readyState === 'complete') finish();
    else {
      const onLoad = () => finish();
      window.addEventListener('load', onLoad, { once: true });
      const safety = setTimeout(finish, 3200);
      return () => {
        window.removeEventListener('load', onLoad);
        clearTimeout(safety);
      };
    }
  }, []);

  if (!mounted || !active) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-bg overflow-hidden transition-opacity duration-700 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Layered background */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="aurora opacity-90" />
      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.15),transparent_60%)]" />

      {/* Spinning ring behind the logo */}
      <div className="relative flex flex-col items-center">
        <div className="relative h-40 w-40 flex items-center justify-center">
          {/* Outer rotating ring */}
          <svg
            className="absolute inset-0 h-full w-full spin-slow"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="46" stroke="url(#ringGrad)" strokeWidth="1.5" strokeLinecap="round" pathLength="100" strokeDasharray="60 40" />
          </svg>

          {/* Inner pulsing rings */}
          <div className="absolute inset-2 rounded-full border border-accent/20" />
          <div className="absolute inset-6 rounded-full border border-accent-2/20" />

          {/* Glow halos */}
          <div className="absolute -inset-10 rounded-full bg-accent/15 blur-3xl animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-accent/30 blur-2xl float" />

          {/* Logo */}
          <div className="relative h-24 w-24 rounded-2xl border border-accent/50 bg-bg-card/90 backdrop-blur overflow-hidden shadow-[0_0_60px_-10px_rgba(34,211,238,0.7)]">
            <img
              src={BRAND_LOGO_URL}
              alt="LLM Mart"
              className="h-full w-full object-cover"
            />
            {/* Sheen sweep */}
            <div className="splash-sheen pointer-events-none absolute inset-0" />
          </div>
        </div>

        {/* Wordmark */}
        <div className="mt-8 text-center">
          <div className="font-mono text-xl font-semibold tracking-tight">
            <span className="text-text">LLM </span>
            <span className="gradient-text-cool">Mart</span>
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.5em] text-text-faint shimmer-text">
            The marketplace for AI inference
          </div>
        </div>

        {/* Loader bar */}
        <div className="mt-8 relative h-[3px] w-56 overflow-hidden rounded-full bg-bg-card border border-border/50">
          <div className="splash-bar absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-transparent via-accent to-accent-2" />
        </div>

        {/* Provider tickers */}
        <div className="mt-6 flex items-center gap-2 text-[10px] text-text-faint">
          <span className="dot pulse-dot" />
          <span className="font-mono">OpenRouter · Venice AI · Uncensored AI</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes splashBar {
          0%   { transform: translateX(-100%); width: 30%; }
          50%  { transform: translateX(40%);  width: 50%; }
          100% { transform: translateX(220%); width: 30%; }
        }
        .splash-bar {
          width: 30%;
          animation: splashBar 1.6s cubic-bezier(.4, 0, .2, 1) infinite;
          box-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
        }
        @keyframes splashSheen {
          0%   { transform: translateX(-120%) skewX(-15deg); opacity: 0; }
          40%  { opacity: 0.6; }
          100% { transform: translateX(220%) skewX(-15deg);  opacity: 0; }
        }
        .splash-sheen {
          background: linear-gradient(110deg, transparent 0%, transparent 40%, rgba(255, 255, 255, 0.55) 50%, transparent 60%, transparent 100%);
          animation: splashSheen 2.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
