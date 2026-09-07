import { cn } from '@/lib/utils';

/** Renders plain text with blank-line separated paragraphs. */
export function Paragraphs({ text, className }: { text?: string | null; className?: string }) {
  const blocks = (text || '')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return null;
  return (
    <div className={cn('prose-seedwel', className)}>
      {blocks.map((block, i) => (
        <p key={i}>{block}</p>
      ))}
    </div>
  );
}

/** Renders a newline separated list as an unordered list. */
export function BulletList({
  items,
  className,
  marker = 'dot',
}: {
  items: string[];
  className?: string;
  marker?: 'dot' | 'check';
}) {
  if (!items?.length) return null;
  return (
    <ul className={cn('space-y-2', className)}>
      {items.map((item, i) => (
        <li key={i} className="relative pl-5 text-[0.95rem] leading-relaxed text-navy-600">
          <span
            aria-hidden
            className={
              marker === 'check'
                ? 'absolute left-0 top-[0.45rem] text-brand-500'
                : 'absolute left-0 top-[0.55rem] h-1.5 w-1.5 rounded-full bg-brand-500'
            }
          >
            {marker === 'check' ? '✓' : null}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
