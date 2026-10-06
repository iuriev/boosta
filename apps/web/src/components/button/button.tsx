import type { ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import styles from './button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Shows the button as busy and blocks further clicks, for example while a form is being sent. */
  pending?: boolean;
}

export function Button({
  pending = false,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={cx(styles.button, className)}
      aria-busy={pending || undefined}
      disabled={pending || rest.disabled}
    >
      {children}
    </button>
  );
}
