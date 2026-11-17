/**
 * Seeded model-based API test against ReferenceModel (D18, Issue #15).
 *
 * Rate limits (D21): every command advances the test clock by 61 s (`clock.advance(61_000)`),
 * so D21 rate limits never fire once #37 lands.
 *
 * Replay a failure using the `seed` and `path` printed by fast-check:
 *   FC_SEED=<n> FC_PATH=<p> npm test -w @lm/api -- model
 */
import * as fc from 'fast-check';
import request from 'supertest';
import { afterAll, describe, it } from 'vitest';
import { fixedClock } from '../../src/ports';
import { resetData, T0, testApp, testPool } from '../helpers';
import { apiCommandsArb, USERS, type Agent, type ModelState, type RealSystem, type UserKey } from './commands';
import { ReferenceModel } from './referenceModel';

const DEFAULT_SEED = 20261117;
const pool = testPool();

afterAll(async () => {
  await pool.end();
});

describe('API model-based test against ReferenceModel (D18)', () => {
  it(
    'matches ReferenceModel across random command sequences for 3 users',
    async () => {
      const seed = process.env.FC_SEED ? Number(process.env.FC_SEED) : DEFAULT_SEED;
      const path = process.env.FC_PATH;
      const params: fc.Parameters<[Iterable<fc.AsyncCommand<ModelState, RealSystem>>]> = {
        seed,
        numRuns: 50,
        ...(path ? { path } : {}),
      };

      await fc.assert(
        fc.asyncProperty(apiCommandsArb, async (cmds) => {
          await resetData(pool);
          const clock = fixedClock(T0);
          const app = testApp(pool, { clock });
          const agents = Object.fromEntries(
            USERS.map((u) => [u, request.agent(app)]),
          ) as Record<UserKey, Agent>;

          const model: ModelState = {
            ref: new ReferenceModel(),
            signedIn: new Set(),
          };
          const real: RealSystem = { app, clock, agents };

          await fc.asyncModelRun(() => ({ model, real }), cmds);
        }),
        params,
      );
    },
    120_000,
  );
});
