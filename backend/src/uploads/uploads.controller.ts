import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { diskStorage, Options } from 'multer';

// Where uploaded files are stored (overridable via UPLOAD_DIR, e.g. in tests).
export const uploadDir = (): string => process.env.UPLOAD_DIR ?? 'uploads';

// Multer config: store images on disk with a unique name; reject non-images.
const imageUpload: Options = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = uploadDir();
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) =>
      cb(null, `${randomUUID()}${extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
};

// Minimal shape of the saved file we actually use.
interface UploadedImage {
  filename: string;
}

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', imageUpload))
  upload(@UploadedFile() file: UploadedImage): { path: string } {
    if (!file) {
      throw new BadRequestException('A valid image file is required');
    }
    return { path: `/uploads/${file.filename}` };
  }
}
