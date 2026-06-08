import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { ClaimsRepository } from './claims.repository';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { Claim, ClaimDocument } from './schemas/claim.schema';
import { CLAIM_STATUSES } from './types/claim.types';
import type { ClaimStats, ClaimStatus } from './types/claim.types';

@Injectable()
export class MongoClaimsRepository extends ClaimsRepository {
  constructor(
    @InjectModel(Claim.name) private readonly claimModel: Model<ClaimDocument>,
  ) {
    super();
  }

  create(data: CreateClaimDto): Promise<ClaimDocument> {
    return this.claimModel.create(data);
  }

  findPage(skip: number, limit: number): Promise<ClaimDocument[]> {
    // Newest claims first.
    return this.claimModel
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  count(): Promise<number> {
    return this.claimModel.countDocuments().exec();
  }

  // One aggregation pass for the whole collection: count and summed value per
  // status, folded into the dashboard shape.
  async stats(): Promise<ClaimStats> {
    const rows = await this.claimModel
      .aggregate<{ _id: ClaimStatus; count: number; value: number }>([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            value: { $sum: '$totalAmount' },
          },
        },
      ])
      .exec();

    const byStatus = Object.fromEntries(
      CLAIM_STATUSES.map((status) => [status, 0]),
    ) as Record<ClaimStatus, number>;
    let total = 0;
    let totalValue = 0;
    for (const row of rows) {
      byStatus[row._id] = row.count;
      total += row.count;
      totalValue += row.value;
    }
    return { total, byStatus, totalValue };
  }

  findById(id: string): Promise<ClaimDocument | null> {
    // A malformed id is treated as "not found" rather than a Mongoose CastError.
    if (!isValidObjectId(id)) {
      return Promise.resolve(null);
    }
    return this.claimModel.findById(id).exec();
  }

  update(id: string, data: UpdateClaimDto): Promise<ClaimDocument | null> {
    return this.claimModel
      .findByIdAndUpdate(id, data, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
  }

  save(claim: ClaimDocument): Promise<ClaimDocument> {
    return claim.save();
  }
}
