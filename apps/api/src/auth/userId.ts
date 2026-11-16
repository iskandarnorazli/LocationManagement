// D7: a UserId can only come from a verified session. Only requireAuth (and the auth routes
// that create a session) call asUserId; it is not exported from auth/index.ts.
declare const brand: unique symbol;
export type UserId = string & { readonly [brand]: 'UserId' };

export function asUserId(verifiedSub: string): UserId {
  return verifiedSub as UserId;
}
