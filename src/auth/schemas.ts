// zod/mini keeps the sign-in route inside the 150 KB initial-JS budget (PRD-UI §9).
import { z } from 'zod/mini';

// Bounds mirror the contract's LoginRequest and RegisterRequest DTOs.
const email = z.pipe(
  z.string().check(
    z.trim(),
    z.minLength(1, { error: 'Enter your email address' }),
    z.maxLength(254, { error: 'Email is too long' }),
  ),
  z.email({ error: 'Enter a valid email address' }),
);

export const signInSchema = z.object({
  email,
  password: z
    .string()
    .check(
      z.minLength(1, { error: 'Enter your password' }),
      z.maxLength(128, { error: 'Password is too long' }),
    ),
});

export const signUpSchema = z.object({
  name: z.string().check(z.trim(), z.maxLength(80, { error: 'Name is too long' })),
  email,
  password: z
    .string()
    .check(
      z.minLength(10, { error: 'Use at least 10 characters' }),
      z.maxLength(128, { error: 'Password is too long' }),
    ),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
