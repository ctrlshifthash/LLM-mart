'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, mono, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-md border border-border bg-bg-elevated/60 px-3 py-2 text-sm text-text placeholder:text-text-faint',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent/50',
      'disabled:opacity-50',
      mono && 'font-mono',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
