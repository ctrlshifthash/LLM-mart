import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdc(n: number | string, opts?: { sign?: boolean; digits?: number }) {
  const v = typeof n === 'string' ? Number(n) : n;
  const digits = opts?.digits ?? (Math.abs(v) < 1 ? 4 : 2);
  const s = v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return opts?.sign && v > 0 ? `+$${s}` : `$${s}`;
}

export function shortAddr(a?: string | null, n = 4) {
  if (!a) return '';
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function formatPrice(perM: number | string) {
  const v = typeof perM === 'string' ? Number(perM) : perM;
  return `$${v.toFixed(2)} / M`;
}
