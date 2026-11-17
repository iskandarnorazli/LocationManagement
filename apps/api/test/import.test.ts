import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ErrorBody, ImportResponse, LocationsResponse } from '@lm/shared';
import { strToU8, zipSync } from 'fflate';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES } from '../src/import/routes';
import { expectBody, resetData, signUp, testApp, testPool } from './helpers';

const pool = testPool();

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await resetData(pool);
});

function makeZipBuffer(text: string, name = 'locations.txt'): Buffer {
  return Buffer.from(zipSync({ [name]: [strToU8(text), { level: 6 }] }));
}

function fixtureZip(name: string): Buffer {
  return readFileSync(path.resolve(__dirname, 'fixtures/zips', name));
}

describe('POST /api/locations/import (R10-R12, D8)', () => {
  it('requires authentication', async () => {
    const app = testApp(pool);
    const res = await request(app)
      .post('/api/locations/import')
      .attach('file', fixtureZip('one.zip'), 'one.zip');
    expect(expectBody(res, 401, ErrorBody).error.code).toBe('UNAUTHENTICATED');
  });

  it('imports the sample ZIP in file order and lists the rows via GET /api/locations', async () => {
    const app = testApp(pool);
    const { agent } = await signUp(app, 'importer@example.com');
    const sampleText = readFileSync(path.resolve(__dirname, 'fixtures/sample.txt'), 'utf8');
    const zipBuf = makeZipBuffer(sampleText);

    const res = await agent
      .post('/api/locations/import')
      .attach('file', zipBuf, 'sample.zip');
    const body = expectBody(res, 201, ImportResponse);
    expect(body.imported).toBe(2);
    expect(body.locations.map((l) => l.name)).toEqual(['Suria KLCC', 'Zoo Negara']);

    const list = expectBody(await agent.get('/api/locations'), 200, LocationsResponse);
    expect(list.locations).toEqual(body.locations);
  });

  it('is all-or-nothing: a bad line 3 rolls back and adds zero rows', async () => {
    const app = testApp(pool);
    const { agent } = await signUp(app, 'atomic@example.com');

    await agent
      .post('/api/locations')
      .send({ name: 'Existing', latitude: 1, longitude: 2 });

    const before = expectBody(await agent.get('/api/locations'), 200, LocationsResponse);
    expect(before.locations).toHaveLength(1);

    const badZip = makeZipBuffer('Name,Latitude,Longitude\nGood1,3.1,101.6\nBadLine\n');
    const res = await agent
      .post('/api/locations/import')
      .attach('file', badZip, 'bad.zip');
    const err = expectBody(res, 422, ErrorBody);
    expect(err.error.code).toBe('FILE_ROWS_INVALID');

    const after = expectBody(await agent.get('/api/locations'), 200, LocationsResponse);
    expect(after.locations).toHaveLength(1);
    expect(after.locations[0]!.name).toBe('Existing');
  });

  it('isolates imported rows per user', async () => {
    const app = testApp(pool);
    const userA = await signUp(app, 'a@example.com');
    const userB = await signUp(app, 'b@example.com');

    const res = await userB.agent
      .post('/api/locations/import')
      .attach('file', fixtureZip('one.zip'), 'one.zip');
    expectBody(res, 201, ImportResponse);

    const listA = expectBody(await userA.agent.get('/api/locations'), 200, LocationsResponse);
    const listB = expectBody(await userB.agent.get('/api/locations'), 200, LocationsResponse);
    expect(listA.locations).toEqual([]);
    expect(listB.locations).toHaveLength(1);
  });

  it('rejects uploads over 1 MiB with 413 PAYLOAD_TOO_LARGE', async () => {
    const app = testApp(pool);
    const { agent } = await signUp(app, 'big@example.com');
    const oversized = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 0x41);

    const res = await agent
      .post('/api/locations/import')
      .attach('file', oversized, 'huge.zip');
    const err = expectBody(res, 413, ErrorBody);
    expect(err.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(err.error.details).toEqual({ limitBytes: MAX_UPLOAD_BYTES });
  });

  it('rejects missing file, non-multipart body, second file, and extra field with 400 VALIDATION_FAILED', async () => {
    const app = testApp(pool);
    const { agent } = await signUp(app, 'bounds@example.com');

    const noFile = await agent.post('/api/locations/import').field('other', 'x');
    expect(expectBody(noFile, 400, ErrorBody).error.code).toBe('VALIDATION_FAILED');

    const jsonBody = await agent
      .post('/api/locations/import')
      .send({ name: 'not multipart' });
    expect(expectBody(jsonBody, 400, ErrorBody).error.code).toBe('VALIDATION_FAILED');

    const twoFiles = await agent
      .post('/api/locations/import')
      .attach('file', fixtureZip('one.zip'), 'one.zip')
      .attach('file', fixtureZip('one.zip'), 'two.zip');
    expect(expectBody(twoFiles, 400, ErrorBody).error.code).toBe('VALIDATION_FAILED');

    const extraField = await agent
      .post('/api/locations/import')
      .attach('file', fixtureZip('one.zip'), 'one.zip')
      .field('extra', '1');
    expect(expectBody(extraField, 400, ErrorBody).error.code).toBe('VALIDATION_FAILED');
  });

  it('maps every ZIP_* and FILE_* failure end-to-end to 422', async () => {
    const app = testApp(pool);
    const { agent } = await signUp(app, 'codes@example.com');

    const cases: Array<[string, Buffer, string]> = [
      ['ZIP_INVALID', Buffer.from('not a zip'), 'ZIP_INVALID'],
      ['ZIP_ENTRY_COUNT', fixtureZip('two-txt.zip'), 'ZIP_ENTRY_COUNT'],
      ['ZIP_NOT_TEXT', fixtureZip('csv-only.zip'), 'ZIP_NOT_TEXT'],
      ['FILE_EMPTY', makeZipBuffer('Name,Latitude,Longitude\n'), 'FILE_EMPTY'],
      ['FILE_ROWS_INVALID', makeZipBuffer('OnlyOneField'), 'FILE_ROWS_INVALID'],
    ];

    for (const [label, buf, expectedCode] of cases) {
      const res = await agent
        .post('/api/locations/import')
        .attach('file', buf, `${label}.zip`);
      const err = expectBody(res, 422, ErrorBody);
      expect(err.error.code, label).toBe(expectedCode);
    }
  });
});
