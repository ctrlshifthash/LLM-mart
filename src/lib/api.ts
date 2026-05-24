import { NextResponse } from 'next/server';
import { HttpError } from './privy';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}
export function err(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...(extra || {}) } }, { status });
}
export function fromError(e: unknown) {
  if (e instanceof HttpError) return err(e.status, 'error', e.message);
  const msg = e instanceof Error ? e.message : 'unexpected error';
  console.error('[api]', e);
  return err(500, 'internal_error', msg);
}
