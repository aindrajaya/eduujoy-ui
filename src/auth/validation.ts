// Loaded on demand by the auth forms (lazyResolver), so Zod is not in the sign-in first load.
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, signUpSchema } from './schemas';

export const signInResolver = zodResolver(signInSchema);
export const signUpResolver = zodResolver(signUpSchema);
