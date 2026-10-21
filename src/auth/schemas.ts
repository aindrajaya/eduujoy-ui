import { z } from 'zod';

// Bounds mirror the contract's LoginRequest and RegisterRequest DTOs.
const email = z
  .string()
  .trim()
  .min(1, { error: 'Enter your email address' })
  .max(254, { error: 'Email is too long' })
  .pipe(z.email({ error: 'Enter a valid email address' }));

export const signInSchema = z.object({
  email,
  password: z
    .string()
    .min(1, { error: 'Enter your password' })
    .max(128, { error: 'Password is too long' }),
});

export const signUpSchema = z.object({
  name: z.string().trim().max(80, { error: 'Name is too long' }),
  email,
  password: z
    .string()
    .min(10, { error: 'Use at least 10 characters' })
    .max(128, { error: 'Password is too long' }),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
