import { z } from 'zod';

export const taskStatuses = ['To Do', 'In Progress', 'Completed'];
export const taskPriorities = ['Low', 'Medium', 'High'];

const uuidSchema = z.string().uuid();
const passwordSchema = z.string().min(8).refine(
  (value) => new TextEncoder().encode(value).length <= 72,
  'Password must not exceed 72 UTF-8 bytes',
);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}, 'Enter a valid calendar date');

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
  workspaceName: z.string().trim().min(2).max(80).optional(),
  inviteToken: z.string().min(32).max(100).optional(),
}).strict().refine(
  (value) => Boolean(value.workspaceName) !== Boolean(value.inviteToken),
  'Choose a workspace name or provide an invitation link',
);

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    'Password must not exceed 72 UTF-8 bytes',
  ),
}).strict();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().max(5000).default(''),
  status: z.enum(taskStatuses).default('To Do'),
  priority: z.enum(taskPriorities).default('Medium'),
  assignedTo: uuidSchema.nullable().default(null),
  dueDate: dateSchema.nullable().default(null),
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().max(5000),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  assignedTo: uuidSchema.nullable(),
  dueDate: dateSchema.nullable(),
}).partial().strict().refine((value) => Object.keys(value).length > 0, {
  message: 'Provide at least one task field to update',
});

export const taskQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  assignedTo: z.union([uuidSchema, z.literal('unassigned')]).optional(),
}).strict();

export const idSchema = uuidSchema;