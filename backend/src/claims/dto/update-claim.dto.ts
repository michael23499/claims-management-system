import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CLAIM_STATUSES, type ClaimStatus } from '../types/claim.types';
import { CLAIM_DESCRIPTION_MAX, CLAIM_TITLE_MAX } from '../types/limits';

export class UpdateClaimDto {
  @ApiPropertyOptional({ maxLength: CLAIM_TITLE_MAX })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CLAIM_TITLE_MAX)
  title?: string;

  @ApiPropertyOptional({ maxLength: CLAIM_DESCRIPTION_MAX })
  @IsOptional()
  @IsString()
  @MaxLength(CLAIM_DESCRIPTION_MAX)
  description?: string;

  @ApiPropertyOptional({ enum: [...CLAIM_STATUSES] })
  @IsOptional()
  @IsIn([...CLAIM_STATUSES])
  status?: ClaimStatus;
}
