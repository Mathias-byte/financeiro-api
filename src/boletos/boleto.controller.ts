import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { Roles } from '../auth/roles.decorator';
import { QueryInt } from '../common/decorators/query-params.decorator';
import { BoletoService } from './boleto.service';
import { CreateBoletoDto, UpdateBoletoDto } from './boleto.dto';

@Controller('boletos')
@ApiTags('boletos')
@ApiBearerAuth()
export class BoletoController {
  constructor(private readonly service: BoletoService) {}

  @Post()
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Cadastrar boleto de uma cobrança (SINDICO); um por cobrança' })
  create(@Body() dto: CreateBoletoDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar boletos (morador: só os do(s) seu(s) imóvel(is))' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false, description: 'padrão 20, máximo 500' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'cobrancaId', required: false })
  @ApiQuery({ name: 'imovelId', required: false, description: 'boletos das cobranças deste imóvel' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @QueryInt('page') page?: number,
    @QueryInt('pageSize') pageSize?: number,
    @QueryInt('status') status?: number,
    @QueryInt('cobrancaId') cobrancaId?: number,
    @QueryInt('imovelId') imovelId?: number,
  ) {
    return this.service.findAll(user, { page, pageSize, status, cobrancaId, imovelId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar boleto pelo ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Alterar boleto (SINDICO)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBoletoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Inativar boleto: fica com status = 0, não é apagado (SINDICO)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
