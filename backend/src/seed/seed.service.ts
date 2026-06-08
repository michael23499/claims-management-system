import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ClaimStatus, Severity } from '../claims/types/claim.types';
import { Claim, ClaimDocument } from '../claims/schemas/claim.schema';

interface SeedDamage {
  part: string;
  description: string;
  imageUrl: string;
  price: number;
  score: number;
  severity: Severity;
}

interface SeedClaim {
  title: string;
  description?: string;
  status: ClaimStatus;
  damages: SeedDamage[];
}

// Loads sample claims into the database so a fresh install shows real data.
// On startup it only seeds when the collection is empty (idempotent); the
// `pnpm seed` command forces a clean reseed.
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.SEED_DISABLE_AUTO === 'true') {
      return;
    }
    if ((await this.claimModel.estimatedDocumentCount()) === 0) {
      await this.insert();
      this.logger.log('Database was empty — seeded with sample claims.');
    }
  }

  async reseed(): Promise<void> {
    await this.claimModel.deleteMany({});
    await this.insert();
    this.logger.log('Database reseeded with sample claims.');
  }

  private async insert(): Promise<void> {
    const claims = this.load().map((claim) => ({
      ...claim,
      totalAmount: claim.damages.reduce((sum, d) => sum + d.price, 0),
    }));
    await this.claimModel.insertMany(claims);
  }

  private load(): SeedClaim[] {
    const file = join(__dirname, 'seed-data.json');
    return JSON.parse(readFileSync(file, 'utf8')) as SeedClaim[];
  }
}
