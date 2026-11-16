// The request and response shapes of docs/API.md. Web forms and API handlers validate with
// these same schemas, so the two cannot drift. zod 4's z.number() rejects NaN and Infinity.
import { z } from 'zod';

export const Credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8).max(128),
});
export type Credentials = z.infer<typeof Credentials>;

export const User = z.object({ id: z.uuid(), email: z.string(), createdAt: z.iso.datetime() });
export type User = z.infer<typeof User>;

export const NewLocation = z.object({
  name: z.string().trim().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type NewLocation = z.infer<typeof NewLocation>;

export const Location = NewLocation.extend({ id: z.uuid(), createdAt: z.iso.datetime() });
export type Location = z.infer<typeof Location>;
