import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8),
  displayName: z.string().trim().nonempty().max(50),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().nonempty(),
});

export type LoginInput = z.infer<typeof loginSchema>;
