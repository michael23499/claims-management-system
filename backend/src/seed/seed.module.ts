import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Claim, ClaimSchema } from '../claims/schemas/claim.schema';
import { SeedService } from './seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Claim.name, schema: ClaimSchema }]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
