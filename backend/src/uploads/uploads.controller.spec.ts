import { uploadDir } from './uploads.controller';

describe('uploadDir', () => {
  const original = process.env.UPLOAD_DIR;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = original;
    }
  });

  it('defaults to "uploads" when UPLOAD_DIR is not set', () => {
    delete process.env.UPLOAD_DIR;
    expect(uploadDir()).toBe('uploads');
  });

  it('uses UPLOAD_DIR when it is set', () => {
    process.env.UPLOAD_DIR = 'custom-dir';
    expect(uploadDir()).toBe('custom-dir');
  });
});
