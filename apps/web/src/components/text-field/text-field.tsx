'use client';

import { type InputHTMLAttributes, type Ref, useId, useState } from 'react';

import styles from './text-field.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Validation message; its presence marks the field as invalid. */
  error?: string;
  /** Guidance shown between the label and the field. */
  hint?: string;
  ref?: Ref<HTMLInputElement>;
}

/**
 * A labelled input with its hint and error wired up for assistive technology.
 * For `type="password"` it adds a control to reveal what was typed.
 */
export function TextField({ label, error, hint, type = 'text', ref, ...rest }: TextFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <div className={styles.control}>
        <input
          {...rest}
          ref={ref}
          id={id}
          className={styles.input}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
        {isPassword ? (
          // The label says what pressing does; that is the only place the state is exposed.
          <button
            type="button"
            className={styles.reveal}
            onClick={() => {
              setRevealed((current) => !current);
            }}
          >
            {revealed ? 'Hide' : 'Show'}
            <span className="visually-hidden"> password</span>
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
