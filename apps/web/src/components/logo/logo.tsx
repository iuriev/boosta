import Image from 'next/image';
import Link from 'next/link';

import styles from './logo.module.css';

interface LogoProps {
  variant?: 'default' | 'on-dark';
  /** Where the logo leads. Omit for a logo that is not a link. */
  href?: string;
}

export function Logo({ variant = 'default', href }: LogoProps) {
  const image = (
    <Image
      className={styles.image}
      src={variant === 'on-dark' ? '/images/logo-on-dark.svg' : '/images/logo.svg'}
      alt="BrainsMate"
      width={184}
      height={33}
      loading={variant === 'default' ? 'eager' : 'lazy'}
      unoptimized
    />
  );
  if (!href) {
    return image;
  }
  return (
    <Link className={styles.link} href={href} aria-label="BrainsMate, start page">
      {image}
    </Link>
  );
}
