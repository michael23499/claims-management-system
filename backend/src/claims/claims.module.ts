import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClaimsController } from './claims.controller';
import { ClaimsRepository } from './claims.repository';
import { ClaimsService } from './claims.service';
import { MongoClaimsRepository } from './mongo-claims.repository';
import { Claim, ClaimSchema } from './schemas/claim.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Claim.name, schema: ClaimSchema }]),
  ],
  controllers: [ClaimsController],
  providers: [
    ClaimsService,
    { provide: ClaimsRepository, useClass: MongoClaimsRepository },
  ],
})
export class ClaimsModule {}
