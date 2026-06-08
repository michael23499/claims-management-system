import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UploadsModule } from './uploads.module';

const TEST_UPLOAD_DIR = resolve('test-uploads');

describe('Uploads (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;

    const moduleRef = await Test.createTestingModule({
      imports: [UploadsModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.UPLOAD_DIR;
    rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
  });

  it('uploads an image and returns its path', async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.from('fake-image-bytes'), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(res.body.path).toMatch(/^\/uploads\/.+\.png$/);
  });

  it('rejects a non-image file', async () => {
    await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.from('just text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });
});
