import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { ClaimsModule } from './claims.module';

const validDamage = {
  part: 'front door',
  description: 'dent from impact',
  imageUrl: 'https://example.com/damage.jpg',
  price: 100,
  score: 5,
  severity: 'low',
};

describe('Claims (integration)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    const moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongod.getUri()), ClaimsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('creates a claim with defaults and exposes id (not _id/__v)', async () => {
    const res = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Integration claim', description: 'created in test' })
      .expect(201);

    expect(res.body).toMatchObject({
      title: 'Integration claim',
      description: 'created in test',
      status: 'pending',
      totalAmount: 0,
      damages: [],
    });
    expect(res.body.id).toBeDefined();
    expect(res.body._id).toBeUndefined();
    expect(res.body.__v).toBeUndefined();
  });

  it('rejects an empty title with 400', async () => {
    await request(app.getHttpServer())
      .post('/claims')
      .send({ title: '' })
      .expect(400);
  });

  it('rejects a title over the max length with 400', async () => {
    await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'x'.repeat(121) })
      .expect(400);
  });

  it('rejects unknown properties with 400', async () => {
    await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'x', totalAmount: 999 })
      .expect(400);
  });

  it('lists the created claims (paginated, newest first)', async () => {
    await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'A claim to list' })
      .expect(201);

    const res = await request(app.getHttpServer()).get('/claims').expect(200);

    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.items[0].id).toBeDefined();
    expect(res.body.items[0]._id).toBeUndefined();
  });

  it('respects the page and limit query params', async () => {
    const res = await request(app.getHttpServer())
      .get('/claims?page=1&limit=2')
      .expect(200);

    expect(res.body.items.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('rejects an invalid pagination param', async () => {
    await request(app.getHttpServer()).get('/claims?limit=0').expect(400);
  });

  it('aggregates portfolio stats across all claims (GET /claims/stats)', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Stats claim' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/claims/${created.body.id}/damages`)
      .send(validDamage)
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get('/claims/stats')
      .expect(200);

    const sumByStatus = Object.values(body.byStatus).reduce(
      (a: number, b) => a + (b as number),
      0,
    );
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(sumByStatus).toBe(body.total);
    expect(body.byStatus.pending).toBeGreaterThanOrEqual(1);
    expect(body.totalValue).toBeGreaterThanOrEqual(100);
  });

  it('gets a single claim by id', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Findable claim' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/claims/${created.body.id}`)
      .expect(200);

    expect(res.body.id).toBe(created.body.id);
    expect(res.body.title).toBe('Findable claim');
  });

  it('returns 404 for a non-existent claim', async () => {
    await request(app.getHttpServer())
      .get('/claims/0123456789abcdef01234567')
      .expect(404);
  });

  it('updates a claim title via PATCH', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Old title' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/claims/${created.body.id}`)
      .send({ title: 'New title' })
      .expect(200);

    expect(res.body.title).toBe('New title');
  });

  it('rejects canceling a claim that is not pending', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'To review' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/claims/${created.body.id}`)
      .send({ status: 'in_review' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/claims/${created.body.id}`)
      .send({ status: 'canceled' })
      .expect(400);
  });

  it('cannot change the status of a terminal (finalized) claim', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'To finalize' })
      .expect(201);

    // No high-severity damage, so finalizing is allowed.
    await request(app.getHttpServer())
      .patch(`/claims/${created.body.id}`)
      .send({ status: 'finalized' })
      .expect(200);

    // Terminal: it can no longer change status.
    await request(app.getHttpServer())
      .patch(`/claims/${created.body.id}`)
      .send({ status: 'pending' })
      .expect(400);
  });

  it('returns 404 when updating a non-existent claim', async () => {
    await request(app.getHttpServer())
      .patch('/claims/0123456789abcdef01234567')
      .send({ title: 'X' })
      .expect(404);
  });

  it('returns 404 for a malformed claim id (GET)', async () => {
    await request(app.getHttpServer()).get('/claims/not-a-valid-id').expect(404);
  });

  it('returns 404 for a malformed claim id (PATCH)', async () => {
    await request(app.getHttpServer())
      .patch('/claims/not-a-valid-id')
      .send({ title: 'X' })
      .expect(404);
  });

  it('adds a damage and returns the claim with the recomputed total', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'With damage' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/claims/${created.body.id}/damages`)
      .send(validDamage)
      .expect(201);

    expect(res.body.damages).toHaveLength(1);
    expect(res.body.damages[0].id).toBeDefined();
    expect(res.body.damages[0]._id).toBeUndefined();
    expect(res.body.totalAmount).toBe(100);
  });

  it('keeps the total equal to the sum of the damage prices', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Sum check' })
      .expect(201);
    const id = created.body.id;

    await request(app.getHttpServer())
      .post(`/claims/${id}/damages`)
      .send({ ...validDamage, price: 100 })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post(`/claims/${id}/damages`)
      .send({ ...validDamage, price: 50 })
      .expect(201);

    expect(res.body.damages).toHaveLength(2);
    expect(res.body.totalAmount).toBe(150);
  });

  it('rejects adding a damage when the claim is not pending', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Not pending' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/claims/${created.body.id}`)
      .send({ status: 'in_review' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/claims/${created.body.id}/damages`)
      .send(validDamage)
      .expect(400);
  });

  it('returns 404 when adding a damage to a non-existent claim', async () => {
    await request(app.getHttpServer())
      .post('/claims/0123456789abcdef01234567/damages')
      .send(validDamage)
      .expect(404);
  });

  it('rejects a damage with a missing required field', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Bad damage' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/claims/${created.body.id}/damages`)
      .send({
        part: 'door',
        description: 'dent',
        imageUrl: 'https://example.com/d.jpg',
        score: 5,
        severity: 'low',
      }) // missing price
      .expect(400);
  });

  it('replaces a damage and recomputes the total', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Replace damage' })
      .expect(201);
    const claimId = created.body.id;
    const withDamage = await request(app.getHttpServer())
      .post(`/claims/${claimId}/damages`)
      .send({ ...validDamage, price: 100 })
      .expect(201);
    const damageId = withDamage.body.damages[0].id;

    const res = await request(app.getHttpServer())
      .put(`/claims/${claimId}/damages/${damageId}`)
      .send({ ...validDamage, price: 250 })
      .expect(200);

    expect(res.body.damages).toHaveLength(1);
    expect(res.body.damages[0].id).toBe(damageId);
    expect(res.body.damages[0].price).toBe(250);
    expect(res.body.totalAmount).toBe(250);
  });

  it('returns 404 when replacing a non-existent damage', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'No such damage' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/claims/${created.body.id}/damages/0123456789abcdef01234567`)
      .send(validDamage)
      .expect(404);
  });

  it('rejects replacing a damage when the claim is not pending', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Not pending replace' })
      .expect(201);
    const claimId = created.body.id;
    const withDamage = await request(app.getHttpServer())
      .post(`/claims/${claimId}/damages`)
      .send(validDamage)
      .expect(201);
    const damageId = withDamage.body.damages[0].id;
    await request(app.getHttpServer())
      .patch(`/claims/${claimId}`)
      .send({ status: 'in_review' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/claims/${claimId}/damages/${damageId}`)
      .send(validDamage)
      .expect(400);
  });

  it('removes a damage and recomputes the total', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Remove damage' })
      .expect(201);
    const claimId = created.body.id;
    await request(app.getHttpServer())
      .post(`/claims/${claimId}/damages`)
      .send({ ...validDamage, price: 100 })
      .expect(201);
    const withTwo = await request(app.getHttpServer())
      .post(`/claims/${claimId}/damages`)
      .send({ ...validDamage, price: 50 })
      .expect(201);
    const damageId = withTwo.body.damages[0].id;

    const res = await request(app.getHttpServer())
      .delete(`/claims/${claimId}/damages/${damageId}`)
      .expect(200);

    expect(res.body.damages).toHaveLength(1);
    expect(res.body.totalAmount).toBe(50);
  });

  it('returns 404 when removing a non-existent damage', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'No such damage to delete' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/claims/${created.body.id}/damages/0123456789abcdef01234567`)
      .expect(404);
  });

  it('rejects removing a damage when the claim is not pending', async () => {
    const created = await request(app.getHttpServer())
      .post('/claims')
      .send({ title: 'Not pending delete' })
      .expect(201);
    const claimId = created.body.id;
    const withDamage = await request(app.getHttpServer())
      .post(`/claims/${claimId}/damages`)
      .send(validDamage)
      .expect(201);
    const damageId = withDamage.body.damages[0].id;
    await request(app.getHttpServer())
      .patch(`/claims/${claimId}`)
      .send({ status: 'in_review' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/claims/${claimId}/damages/${damageId}`)
      .expect(400);
  });
});
