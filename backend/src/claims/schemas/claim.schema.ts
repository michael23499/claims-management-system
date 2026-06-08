import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ID_TRANSFORM } from '../../common/mongo/to-json';
import { CLAIM_STATUSES, SEVERITIES } from '../types/claim.types';
import type { ClaimStatus, Severity } from '../types/claim.types';

export type ClaimDocument = HydratedDocument<Claim>;

// Damages are embedded subdocuments inside the parent Claim.
@Schema({ _id: true, toJSON: ID_TRANSFORM })
export class Damage {
  // Added by Mongoose at runtime; declared here to match subdocuments by id.
  _id?: Types.ObjectId;

  @Prop({ required: true })
  part!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  imageUrl!: string;

  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ required: true, min: 1, max: 10 })
  score!: number;

  @Prop({ required: true, type: String, enum: [...SEVERITIES] })
  severity!: Severity;
}

export const DamageSchema = SchemaFactory.createForClass(Damage);

@Schema({ timestamps: true, toJSON: ID_TRANSFORM })
export class Claim {
  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    type: String,
    enum: [...CLAIM_STATUSES],
    default: 'pending',
  })
  status!: ClaimStatus;

  @Prop({ type: [DamageSchema], default: [] })
  damages!: Damage[];

  @Prop({ required: true, default: 0, min: 0 })
  totalAmount!: number;
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);

// Backs the "newest first" sort of the paginated list.
ClaimSchema.index({ createdAt: -1 });
