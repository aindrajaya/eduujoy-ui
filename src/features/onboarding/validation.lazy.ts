// Loaded on demand (lazyResolver), keeping Zod out of the /start chunk until the form is used.
import { zodResolver } from '@hookform/resolvers/zod';
import { intakeSchema } from './schema';

export const intakeResolver = zodResolver(intakeSchema);
