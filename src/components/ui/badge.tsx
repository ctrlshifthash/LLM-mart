import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        default: 'bg-bg-card border-border text-text-dim',
        accent: 'bg-accent/10 border-accent/30 text-accent',
        success: 'bg-success/10 border-success/30 text-success',
        warn: 'bg-warn/10 border-warn/30 text-warn',
        danger: 'bg-danger/10 border-danger/30 text-danger',
        outline: 'border-border-strong text-text-dim',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
