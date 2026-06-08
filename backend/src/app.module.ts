import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClaimsModule } from './claims/claims.module';
import { UploadsModule } from './uploads/uploads.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    // Override the connection with the MONGODB_URI env var (e.g. Atlas).
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27018/claims',
    ),
    ClaimsModule,
    UploadsModule,
    SeedModule,
  ],
})
export class AppModule {}
