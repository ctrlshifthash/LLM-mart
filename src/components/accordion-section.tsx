'use client';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';

export function AccordionSection({
  value,
  number,
  title,
  subtitle,
  children,
}: {
  value: string;
  number: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>
        <div className="flex items-center gap-4">
          <span className="num-badge">{number}</span>
          <div>
            <div className="text-base font-semibold">{title}</div>
            {subtitle && <div className="text-xs text-text-dim font-normal mt-0.5">{subtitle}</div>}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}
