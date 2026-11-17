import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ErrorBody,
  ImportResponse,
  LocationResponse,
  LocationsResponse,
  UserResponse,
  type Location,
  type NewLocation,
} from '@lm/shared';
import type { Express } from 'express';
import * as fc from 'fast-check';
import { strToU8, zipSync } from 'fflate';
import request from 'supertest';
import { expect } from 'vitest';
import type { fixedClock } from '../../src/ports';
import { expectBody } from '../helpers';
import type { ReferenceModel } from './referenceModel';

export const USERS = ['u1@example.com', 'u2@example.com', 'u3@example.com'] as const;
export type UserKey = (typeof USERS)[number];

const PASSWORDS: Record<UserKey, string> = {
  'u1@example.com': 'password-user-1',
  'u2@example.com': 'password-user-2',
  'u3@example.com': 'password-user-3',
};

const EMAIL_VARIANTS: Record<UserKey, readonly string[]> = {
  'u1@example.com': ['u1@example.com', 'U1@EXAMPLE.COM', 'U1@Example.Com'],
  'u2@example.com': ['u2@example.com', 'U2@EXAMPLE.COM', 'U2@Example.Com'],
  'u3@example.com': ['u3@example.com', 'U3@EXAMPLE.COM', 'U3@Example.Com'],
};

const CLOCK_STEP_MS = 61_000;

export type Agent = ReturnType<typeof request.agent>;

export type ModelState = {
  ref: ReferenceModel;
  signedIn: Set<UserKey>;
};

export type RealSystem = {
  app: Express;
  clock: ReturnType<typeof fixedClock>;
  agents: Record<UserKey, Agent>;
};

export type ApiCommand = fc.AsyncCommand<ModelState, RealSystem>;

function toNewLocations(locations: readonly Location[]): NewLocation[] {
  return locations.map(({ name, latitude, longitude }) => ({ name, latitude, longitude }));
}

async function assertAllListsMatch(m: ModelState, r: RealSystem): Promise<void> {
  for (const user of USERS) {
    if (!m.signedIn.has(user)) continue;
    const res = await r.agents[user].get('/api/locations');
    const body = expectBody(res, 200, LocationsResponse);
    expect(toNewLocations(body.locations)).toEqual(m.ref.locationsOf(user));
  }
}

const FIXTURE_ONE_ZIP = readFileSync(path.resolve(__dirname, '../fixtures/zips/one.zip'));
const FIXTURE_TWO_TXT_ZIP = readFileSync(path.resolve(__dirname, '../fixtures/zips/two-txt.zip'));
const SAMPLE_ROWS: NewLocation[] = [
  { name: 'Suria KLCC', latitude: 3.157324409, longitude: 101.7121981 },
];

function makeZipBuffer(text: string, filename = 'locations.txt'): Buffer {
  return Buffer.from(zipSync({ [filename]: [strToU8(text), { level: 6 }] }));
}

class RegisterCommand implements ApiCommand {
  constructor(
    private readonly user: UserKey,
    private readonly emailVariant: string,
  ) {}

  check(): boolean {
    return true;
  }

  async run(m: ModelState, r: RealSystem): Promise<void> {
    r.clock.advance(CLOCK_STEP_MS);
    const password = PASSWORDS[this.user];
    const outcome = m.ref.register(this.emailVariant, password);

    if (outcome.ok) {
      const res = await r.agents[this.user]
        .post('/api/auth/register')
        .send({ email: this.emailVariant, password });
      const body = expectBody(res, 201, UserResponse);
      expect(body.user.email).toBe(this.user);
      m.signedIn.add(this.user);
      return;
    }

    const res = await request(r.app)
      .post('/api/auth/register')
      .send({ email: this.emailVariant, password });
    const err = expectBody(res, 409, ErrorBody);
    expect(err.error.code).toBe(outcome.code);
  }

  toString(): string {
    return `register(${this.emailVariant})`;
  }
}

class LoginCommand implements ApiCommand {
  constructor(
    private readonly user: UserKey,
    private readonly emailVariant: string,
    private readonly wrongPassword: boolean,
  ) {}

  check(): boolean {
    return true;
  }

  async run(m: ModelState, r: RealSystem): Promise<void> {
    r.clock.advance(CLOCK_STEP_MS);
    const password = this.wrongPassword ? 'wrong-password-123' : PASSWORDS[this.user];
    const outcome = m.ref.login(this.emailVariant, password);

    if (outcome.ok) {
      const res = await r.agents[this.user]
        .post('/api/auth/login')
        .send({ email: this.emailVariant, password });
      const body = expectBody(res, 200, UserResponse);
      expect(body.user.email).toBe(this.user);
      m.signedIn.add(this.user);
      return;
    }

    const res = await request(r.app)
      .post('/api/auth/login')
      .send({ email: this.emailVariant, password });
    const err = expectBody(res, 401, ErrorBody);
    expect(err.error.code).toBe(outcome.code);
  }

  toString(): string {
    return `login(${this.emailVariant}, wrong=${this.wrongPassword})`;
  }
}

class CreateLocationCommand implements ApiCommand {
  constructor(
    private readonly user: UserKey,
    private readonly payload: NewLocation,
    private readonly valid: boolean,
  ) {}

  check(m: Readonly<ModelState>): boolean {
    return m.signedIn.has(this.user);
  }

  async run(m: ModelState, r: RealSystem): Promise<void> {
    r.clock.advance(CLOCK_STEP_MS);
    const res = await r.agents[this.user].post('/api/locations').send(this.payload);

    if (this.valid) {
      m.ref.addLocation(this.user, this.payload);
      const body = expectBody(res, 201, LocationResponse);
      expect(toNewLocations([body.location])[0]).toEqual(this.payload);
    } else {
      const err = expectBody(res, 400, ErrorBody);
      expect(err.error.code).toBe('VALIDATION_FAILED');
    }

    await assertAllListsMatch(m, r);
  }

  toString(): string {
    return `createLocation(${this.user}, ${JSON.stringify(this.payload)}, valid=${this.valid})`;
  }
}

class ListLocationsCommand implements ApiCommand {
  constructor(private readonly user: UserKey) {}

  check(): boolean {
    return true;
  }

  async run(m: ModelState, r: RealSystem): Promise<void> {
    r.clock.advance(CLOCK_STEP_MS);
    const res = await r.agents[this.user].get('/api/locations');

    if (m.signedIn.has(this.user)) {
      const body = expectBody(res, 200, LocationsResponse);
      expect(toNewLocations(body.locations)).toEqual(m.ref.locationsOf(this.user));
      return;
    }

    const err = expectBody(res, 401, ErrorBody);
    expect(err.error.code).toBe('UNAUTHENTICATED');
  }

  toString(): string {
    return `list(${this.user})`;
  }
}

class CrossUserListCommand implements ApiCommand {
  check(m: Readonly<ModelState>): boolean {
    return m.signedIn.size > 0;
  }

  async run(m: ModelState, r: RealSystem): Promise<void> {
    r.clock.advance(CLOCK_STEP_MS);
    await assertAllListsMatch(m, r);
  }

  toString(): string {
    return 'crossUserList()';
  }
}

type ImportVariant =
  | { kind: 'valid-fixture' }
  | { kind: 'valid-multi'; rows: NewLocation[] }
  | { kind: 'two-txt' }
  | { kind: 'bad-line' };

class ImportCommand implements ApiCommand {
  constructor(
    private readonly user: UserKey,
    private readonly variant: ImportVariant,
  ) {}

  check(m: Readonly<ModelState>): boolean {
    return m.signedIn.has(this.user);
  }

  async run(m: ModelState, r: RealSystem): Promise<void> {
    r.clock.advance(CLOCK_STEP_MS);

    let zipBuffer: Buffer;
    let filename: string;
    let rows: NewLocation[] | null;
    let failureCode: string | undefined;

    switch (this.variant.kind) {
      case 'valid-fixture':
        zipBuffer = FIXTURE_ONE_ZIP;
        filename = 'one.zip';
        rows = SAMPLE_ROWS;
        break;
      case 'valid-multi': {
        const text =
          'Name, Latitude, Longitude\n' +
          this.variant.rows.map((row) => `${row.name},${row.latitude},${row.longitude}`).join('\n');
        zipBuffer = makeZipBuffer(text);
        filename = 'multi.zip';
        rows = this.variant.rows;
        break;
      }
      case 'two-txt':
        zipBuffer = FIXTURE_TWO_TXT_ZIP;
        filename = 'two-txt.zip';
        rows = null;
        failureCode = 'ZIP_ENTRY_COUNT';
        break;
      case 'bad-line':
        zipBuffer = makeZipBuffer('Name,Latitude,Longitude\nGood,3.1,101.6\nBadLine\n');
        filename = 'bad-line.zip';
        rows = null;
        failureCode = 'FILE_ROWS_INVALID';
        break;
    }

    const outcome = m.ref.importRows(this.user, rows, failureCode);
    const res = await r.agents[this.user]
      .post('/api/locations/import')
      .attach('file', zipBuffer, filename);

    if (outcome.ok) {
      const body = expectBody(res, 201, ImportResponse);
      expect(body.imported).toBe(outcome.value);
      expect(toNewLocations(body.locations)).toEqual(rows);
    } else {
      const err = expectBody(res, 422, ErrorBody);
      expect(err.error.code).toBe(outcome.code);
    }

    await assertAllListsMatch(m, r);
  }

  toString(): string {
    return `import(${this.user}, ${this.variant.kind})`;
  }
}

const userArb = fc.constantFrom<UserKey>(...USERS);

const emailVariantFor = (user: UserKey): fc.Arbitrary<string> =>
  fc.constantFrom(...EMAIL_VARIANTS[user]);

const validNameArb = fc
  .stringMatching(/^[A-Za-z0-9][A-Za-z0-9 -]{0,28}[A-Za-z0-9]$/)
  .map((s) => s.trim())
  .filter((s) => s.length >= 1 && s.length <= 200);

const coordArb = (min: number, max: number): fc.Arbitrary<number> =>
  fc
    .integer({ min: min * 1_000_000, max: max * 1_000_000 })
    .map((n) => (n === 0 ? 0 : n / 1_000_000));

const validLocationArb: fc.Arbitrary<NewLocation> = fc.record({
  name: validNameArb,
  latitude: coordArb(-90, 90),
  longitude: coordArb(-180, 180),
});

const invalidLocationArb: fc.Arbitrary<NewLocation> = fc.oneof(
  fc.record({ name: fc.constant(''), latitude: coordArb(-90, 90), longitude: coordArb(-180, 180) }),
  fc.record({ name: validNameArb, latitude: fc.constant(91), longitude: coordArb(-180, 180) }),
  fc.record({ name: validNameArb, latitude: coordArb(-90, 90), longitude: fc.constant(-181) }),
);

const importVariantArb: fc.Arbitrary<ImportVariant> = fc.oneof(
  fc.constant<ImportVariant>({ kind: 'valid-fixture' }),
  fc
    .array(validLocationArb, { minLength: 2, maxLength: 3 })
    .map((rows): ImportVariant => ({ kind: 'valid-multi', rows })),
  fc.constant<ImportVariant>({ kind: 'two-txt' }),
  fc.constant<ImportVariant>({ kind: 'bad-line' }),
);

export const apiCommandsArb: fc.Arbitrary<Iterable<ApiCommand>> = fc.commands(
  [
    userArb.chain((u) => emailVariantFor(u).map((e) => new RegisterCommand(u, e))),
    userArb.chain((u) =>
      fc
        .tuple(emailVariantFor(u), fc.boolean())
        .map(([e, wrong]) => new LoginCommand(u, e, wrong)),
    ),
    fc
      .tuple(userArb, validLocationArb)
      .map(([u, loc]) => new CreateLocationCommand(u, loc, true)),
    fc
      .tuple(userArb, invalidLocationArb)
      .map(([u, loc]) => new CreateLocationCommand(u, loc, false)),
    userArb.map((u) => new ListLocationsCommand(u)),
    fc.constant(new CrossUserListCommand()),
    fc.tuple(userArb, importVariantArb).map(([u, v]) => new ImportCommand(u, v)),
  ],
  { maxCommands: 30 },
);
