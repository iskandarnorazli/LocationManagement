// The request and response shapes of docs/API.md. Web forms and API handlers validate with
// these same schemas, so the two cannot drift. zod 4's z.number() rejects NaN and Infinity.
import { z } from 'zod';

export const Credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(8).max(128),
});
export type Credentials = z.infer<typeof Credentials>;

export const User = z
  .object({ id: z.uuid(), email: z.string(), createdAt: z.iso.datetime() })
  .strict();
export type User = z.infer<typeof User>;

export const NewLocation = z.object({
  name: z.string().trim().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type NewLocation = z.infer<typeof NewLocation>;

export const Location = NewLocation.extend({ id: z.uuid(), createdAt: z.iso.datetime() }).strict();
export type Location = z.infer<typeof Location>;

// Response bodies of docs/API.md. Strict: a body with any extra field (a token, a password
// hash, a userId) fails the contract check in the API tests (D20).
export const HealthBody = z.object({ status: z.literal('ok') }).strict();
export const UserResponse = z.object({ user: User }).strict();
export const LocationResponse = z.object({ location: Location }).strict();
export const LocationsResponse = z.object({ locations: z.array(Location) }).strict();
export const ImportResponse = z
  .object({ imported: z.number().int().min(1), locations: z.array(Location) })
  .strict()
  .refine((b) => b.imported === b.locations.length, 'imported must equal locations.length');
