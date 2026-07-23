import Image from 'next/image';
import Link from 'next/link';

type BrandLogoProps = {
  href?: string;
  showText?: boolean;
  compact?: boolean;
  variant?: 'horizontal' | 'stacked';
  className?: string;
  markClassName?: string;
};

export function SiteLagerMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`} aria-label="SiteLager" role="img">
      <Image
        src="/brand/sitelager-mark-approved.png"
        alt=""
        width={512}
        height={512}
        sizes="48px"
        className="block h-full w-full object-contain"
        priority
        unoptimized
      />
    </span>
  );
}

export function BrandLogo({
  href,
  showText = true,
  compact = false,
  variant = 'horizontal',
  className = '',
  markClassName,
}: BrandLogoProps) {
  const content = (
    <span className={`inline-flex min-w-0 shrink-0 items-center ${className}`}>
      {showText ? (
        <Image
          src={
            variant === 'stacked'
              ? '/brand/sitelager-logo-approved.png'
              : '/brand/sitelager-logo-horizontal-approved.png'
          }
          alt="SiteLager"
          width={variant === 'stacked' ? 421 : 287}
          height={variant === 'stacked' ? 384 : 108}
          sizes={
            variant === 'stacked'
              ? compact
                ? '112px'
                : '144px'
              : compact
                ? '120px'
                : '144px'
          }
          className={
            variant === 'stacked'
              ? `block w-auto object-contain ${compact ? 'h-28' : 'h-36'}`
              : `block w-auto object-contain ${compact ? 'h-10' : 'h-12'}`
          }
          priority
          unoptimized
        />
      ) : (
        <SiteLagerMark className={markClassName ?? (compact ? 'h-10 w-10' : 'h-12 w-12')} />
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} aria-label="SiteLager home" className="inline-flex items-center">
      {content}
    </Link>
  );
}
