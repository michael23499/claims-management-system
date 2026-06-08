import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { ClaimDocument } from './schemas/claim.schema';
import { ClaimStats } from './types/claim.types';

// Repository contract. Also serves as the DI token for the implementation.
export abstract class ClaimsRepository {
  abstract create(data: CreateClaimDto): Promise<ClaimDocument>;
  abstract findPage(skip: number, limit: number): Promise<ClaimDocument[]>;
  abstract count(): Promise<number>;
  abstract stats(): Promise<ClaimStats>;
  abstract findById(id: string): Promise<ClaimDocument | null>;
  abstract update(
    id: string,
    data: UpdateClaimDto,
  ): Promise<ClaimDocument | null>;
  abstract save(claim: ClaimDocument): Promise<ClaimDocument>;
}
