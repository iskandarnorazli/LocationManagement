import http from 'node:http';
import { ErrorBody } from '@lm/shared';
import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/http/errorHandler';
import { concurrencyLimit, rateLimit } from '../src/http/limits';
import { fixedClock } from '../src/ports';
import { expectBody, T0 } from './helpers';

function makeTestApp(middleware: express.RequestHandler, handler: express.RequestHandler) {
  const app = express();
  app.use((req, _res, next) => {
    req.id = 'req-1';
    req.log = pino({ level: 'silent' });
    next();
  });
  app.use(middleware);
  app.get('/test', handler);
  app.use(errorHandler);
  return app;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('concurrencyLimit (D21)', () => {
  it('admits up to max requests, rejects the next with 429, and admits after finish', async () => {
    const gates = [deferred(), deferred()];
    let idx = 0;
    const app = makeTestApp(concurrencyLimit(2), async (_req, res) => {
      const gate = gates[idx++];
      if (gate) await gate.promise;
      res.status(200).json({ ok: true });
    });

    const p1 = request(app).get('/test').then((r) => r);
    const p2 = request(app).get('/test').then((r) => r);
    await new Promise((r) => setTimeout(r, 20));

    const third = await request(app).get('/test');
    const err = expectBody(third, 429, ErrorBody);
    expect(err.error.code).toBe('RATE_LIMITED');

    gates[0]!.resolve();
    expect((await p1).status).toBe(200);

    const fourth = await request(app).get('/test');
    expect(fourth.status).toBe(200);

    gates[1]!.resolve();
    expect((await p2).status).toBe(200);
  });

  it('releases slot on client abort (close)', async () => {
    const gate = deferred();
    let entered = false;
    const app = makeTestApp(concurrencyLimit(1), async (_req, res) => {
      entered = true;
      await gate.promise;
      if (!res.writableEnded) res.status(200).json({ ok: true });
    });

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };

    try {
      const req1 = http.get(`http://127.0.0.1:${addr.port}/test`);
      req1.on('error', () => {});
      while (!entered) {
        await new Promise((r) => setTimeout(r, 5));
      }
      req1.destroy();
      await new Promise((r) => setTimeout(r, 30));

      gate.resolve();
      const res2 = await request(app).get('/test');
      expect(res2.status).toBe(200);
    } finally {
      server.close();
    }
  });

  it('releases slot once per request even when the handler throws', async () => {
    let shouldThrow = true;
    const app = makeTestApp(concurrencyLimit(1), () => {
      if (shouldThrow) throw new Error('boom');
      return;
    });

    const r1 = await request(app).get('/test');
    expectBody(r1, 500, ErrorBody);

    shouldThrow = false;
    const app2 = makeTestApp(concurrencyLimit(1), (_req, res) => {
      if (shouldThrow) throw new Error('boom');
      res.status(200).json({ ok: true });
    });
    shouldThrow = true;
    expectBody(await request(app2).get('/test'), 500, ErrorBody);
    shouldThrow = false;
    expect((await request(app2).get('/test')).status).toBe(200);
  });
});

describe('rateLimit (D21)', () => {
  it('blocks the (max + 1)th request with 429 and Retry-After, and resets after windowMs', async () => {
    const clock = fixedClock(T0);
    const app = makeTestApp(
      rateLimit({ windowMs: 60_000, max: 3, key: () => 'user-1' }, clock),
      (_req, res) => {
        res.status(200).json({ ok: true });
      },
    );

    for (let i = 0; i < 3; i++) {
      expect((await request(app).get('/test')).status).toBe(200);
    }

    clock.advance(15_000);
    const blocked = await request(app).get('/test');
    const err = expectBody(blocked, 429, ErrorBody);
    expect(err.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after']).toBe('45');
    expect(err.error.details).toEqual({ retryAfterSeconds: 45 });

    clock.advance(45_000);
    expect((await request(app).get('/test')).status).toBe(200);
  });

  it('skips limiting when key returns null and counts different keys separately', async () => {
    const clock = fixedClock(T0);
    const app = makeTestApp(
      rateLimit(
        {
          windowMs: 60_000,
          max: 1,
          key: (req) => (req.headers['x-key'] ? String(req.headers['x-key']) : null),
        },
        clock,
      ),
      (_req, res) => {
        res.status(200).json({ ok: true });
      },
    );

    expect((await request(app).get('/test')).status).toBe(200);
    expect((await request(app).get('/test')).status).toBe(200);

    expect((await request(app).get('/test').set('x-key', 'a')).status).toBe(200);
    expectBody(await request(app).get('/test').set('x-key', 'a'), 429, ErrorBody);
    expect((await request(app).get('/test').set('x-key', 'b')).status).toBe(200);
  });

  it('drops ended windows so memory stays bounded across 10,000 distinct keys', () => {
    const clock = fixedClock(T0);
    const mw = rateLimit(
      {
        windowMs: 60_000,
        max: 1,
        key: (req) => String(req.headers['x-key'] ?? 'default'),
      },
      clock,
    );

    const noopRes = { setHeader: () => noopRes } as unknown as express.Response;
    for (let i = 0; i < 10_000; i++) {
      const req = { headers: { 'x-key': `k-${i}` } } as unknown as express.Request;
      let called = false;
      mw(req, noopRes, () => {
        called = true;
      });
      expect(called).toBe(true);
    }

    clock.advance(60_000);
    // Any old key from window 1 is allowed again (not blocked) and triggers sweep.
    for (const key of ['k-0', 'k-9999']) {
      const req = { headers: { 'x-key': key } } as unknown as express.Request;
      let called = false;
      mw(req, noopRes, () => {
        called = true;
      });
      expect(called).toBe(true);
    }
  });
});
