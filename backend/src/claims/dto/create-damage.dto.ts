import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SEVERITIES, type Severity } from '../types/claim.types';
import { DAMAGE_DESCRIPTION_MAX, DAMAGE_PART_MAX } from '../types/limits';

export class CreateDamageDto {
  @ApiProperty({ maxLength: DAMAGE_PART_MAX })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DAMAGE_PART_MAX)
  part!: string;

  @ApiProperty({ maxLength: DAMAGE_DESCRIPTION_MAX })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DAMAGE_DESCRIPTION_MAX)
  description!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false }) // allow localhost URLs from the upload endpoint
  imageUrl!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(10)
  score!: number;

  @ApiProperty({ enum: [...SEVERITIES] })
  @IsIn([...SEVERITIES])
  severity!: Severity;
}
