import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { CreateDamageDto } from './dto/create-damage.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';

@ApiTags('Claims')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  create(@Body() dto: CreateClaimDto) {
    return this.claimsService.create(dto);
  }

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.claimsService.findPage(query.page, query.limit);
  }

  // Declared before ':id' so "stats" isn't captured as a claim id.
  @Get('stats')
  stats() {
    return this.claimsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.claimsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClaimDto) {
    return this.claimsService.update(id, dto);
  }

  @Post(':id/damages')
  addDamage(@Param('id') id: string, @Body() dto: CreateDamageDto) {
    return this.claimsService.addDamage(id, dto);
  }

  @Put(':id/damages/:damageId')
  replaceDamage(
    @Param('id') id: string,
    @Param('damageId') damageId: string,
    @Body() dto: CreateDamageDto,
  ) {
    return this.claimsService.replaceDamage(id, damageId, dto);
  }

  @Delete(':id/damages/:damageId')
  removeDamage(
    @Param('id') id: string,
    @Param('damageId') damageId: string,
  ) {
    return this.claimsService.removeDamage(id, damageId);
  }
}
