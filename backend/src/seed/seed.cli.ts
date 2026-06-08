import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

// Standalone entry for `pnpm seed`: forces a clean reseed (clear + insert).
// Disables the on-startup auto-seed so it doesn't run twice.
process.env.SEED_DISABLE_AUTO = 'true';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.get(SeedService).reseed();
  await app.close();
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    Logger.error(err);
    process.exit(1);
  });
