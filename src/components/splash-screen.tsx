'use client';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

const SESSION_KEY = 'llmart-splash-shown';
const MIN_DURATION = 900;

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
        }, 450);
      }, wait);
    };
    if (document.readyState === 'complete') finish();
    else {
      const onLoad = () => finish();
      window.addEventListener('load', onLoad, { once: true });
      // Hard timeout safety
      const safety = setTimeout(finish, 2200);
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
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-bg transition-opacity duration-500 ${
        fadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="aurora opacity-80" />
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="relative flex flex-col items-center">
        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-accent/20 blur-2xl animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-accent/40 blur-xl float" />
          <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl border border-accent/40 bg-bg-card/80 backdrop-blur">
            <Zap className="h-7 w-7 text-accent drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
          </div>
        </div>
        <div className="mt-6 text-center">
          <div className="font-mono text-sm font-semibold tracking-tight shimmer-text">
            LLM Mart
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-text-faint">
            Inference Marketplace
          </div>
        </div>
        <div className="mt-6 h-[2px] w-40 overflow-hidden rounded-full bg-bg-card">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent animate-[loader_1.2s_ease-in-out_infinite]" />
        </div>
        <style jsx>{`
          @keyframes loader {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
          }
        `}</style>
      </div>
    </div>
  );
}
