import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CLAIM_DESCRIPTION_MAX, CLAIM_TITLE_MAX } from '../types/limits';

export class CreateClaimDto {
  @ApiProperty({ description: 'Claim title', maxLength: CLAIM_TITLE_MAX })
  @IsString()
  @IsNotEmpty()
  @MaxLength(CLAIM_TITLE_MAX)
  title!: string;

  @ApiPropertyOptional({
    description: 'General claim description',
    maxLength: CLAIM_DESCRIPTION_MAX,
  })
  @IsOptional()
  @IsString()
  @MaxLength(CLAIM_DESCRIPTION_MAX)
  description?: string;
}
