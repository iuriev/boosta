import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .pipe(z.email('Enter a valid email address'));

/** bcrypt, used by the API, reads at most 72 bytes of a password. */
const fitsInBcrypt = (value: string) => new TextEncoder().encode(value).length <= 72;

export const signUpSchema = z.object({
  email,
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(72, 'Use at most 72 characters')
    .refine(fitsInBcrypt, 'This password is too long'),
});

/** Sign-in does not repeat the sign-up rules: a wrong password is the API's to judge. */
export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export type Credentials = z.infer<typeof signUpSchema>;
