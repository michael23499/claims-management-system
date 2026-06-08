import { Injectable, NotFoundException } from '@nestjs/common';
import { ClaimErrors } from '../common/errors';
import { Paginated } from '../common/pagination';
import { ClaimsRepository } from './claims.repository';
import { CreateClaimDto } from './dto/create-claim.dto';
import { CreateDamageDto } from './dto/create-damage.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import {
  assertClaimIsPending,
  assertStatusChange,
  calculateTotal,
  hasHighSeverityDamage,
} from './helpers/claim-rules';
import { ClaimDocument, Damage } from './schemas/claim.schema';
import { ClaimStats } from './types/claim.types';

@Injectable()
export class ClaimsService {
  constructor(private readonly claims: ClaimsRepository) {}

  getStats(): Promise<ClaimStats> {
    return this.claims.stats();
  }

  async create(dto: CreateClaimDto): Promise<ClaimDocument> {
    return this.claims.create(dto);
  }

  async findPage(
    page: number,
    limit: number,
  ): Promise<Paginated<ClaimDocument>> {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.claims.findPage(skip, limit),
      this.claims.count(),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<ClaimDocument> {
    const claim = await this.claims.findById(id);
    if (!claim) {
      throw new NotFoundException(ClaimErrors.notFound(id));
    }
    return claim;
  }

  async update(id: string, dto: UpdateClaimDto): Promise<ClaimDocument> {
    const claim = await this.findOne(id); // throws 404 if missing

    if (dto.status !== undefined) {
      assertStatusChange({
        current: claim.status,
        next: dto.status,
        hasHighSeverity: hasHighSeverityDamage(claim.damages),
        description: dto.description ?? claim.description ?? '',
      });
    }

    // findOne above guarantees the claim exists, so update never returns null.
    return (await this.claims.update(id, dto)) as ClaimDocument;
  }

  async addDamage(id: string, dto: CreateDamageDto): Promise<ClaimDocument> {
    const claim = await this.findOne(id); // throws 404 if missing
    assertClaimIsPending(claim.status);

    claim.damages.push(dto as Damage);
    claim.totalAmount = calculateTotal(claim.damages);

    return this.claims.save(claim);
  }

  async replaceDamage(
    claimId: string,
    damageId: string,
    dto: CreateDamageDto,
  ): Promise<ClaimDocument> {
    const claim = await this.findOne(claimId); // throws 404 if missing
    assertClaimIsPending(claim.status);

    const damage = claim.damages.find((d) => d._id?.toString() === damageId);
    if (!damage) {
      throw new NotFoundException(ClaimErrors.damageNotFound(damageId));
    }

    Object.assign(damage, dto);
    claim.totalAmount = calculateTotal(claim.damages);

    return this.claims.save(claim);
  }

  async removeDamage(
    claimId: string,
    damageId: string,
  ): Promise<ClaimDocument> {
    const claim = await this.findOne(claimId); // throws 404 if missing
    assertClaimIsPending(claim.status);

    const index = claim.damages.findIndex((d) => d._id?.toString() === damageId);
    if (index === -1) {
      throw new NotFoundException(ClaimErrors.damageNotFound(damageId));
    }

    claim.damages.splice(index, 1);
    claim.totalAmount = calculateTotal(claim.damages);

    return this.claims.save(claim);
  }
}
