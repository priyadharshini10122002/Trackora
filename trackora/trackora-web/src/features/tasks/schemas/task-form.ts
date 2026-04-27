import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(150, 'Title must be at most 150 characters'),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional()
    .default(''),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  due_date: z
    .string()
    .optional()
    .refine((val) => !val || new Date(val) > new Date(), {
      message: 'Due date must be in the future',
    }),
  sla_hours: z.coerce
    .number()
    .int('SLA hours must be a whole number')
    .positive('SLA hours must be positive')
    .optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
