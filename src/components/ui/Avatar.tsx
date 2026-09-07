import Image from 'next/image';
import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  src,
  size = 40,
  className,
  ring = false,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const [first = '', last = ''] = name.split(' ');
  const label = initials(first, last);
  const fontSize = Math.max(11, Math.round(size * 0.36));

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full object-cover', ring && 'ring-2 ring-white', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-navy-900 font-semibold uppercase text-white',
        ring && 'ring-2 ring-white',
        className,
      )}
      style={{ width: size, height: size, fontSize }}
    >
      {label}
    </span>
  );
}
