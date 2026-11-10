import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { Roles } from '../auth/roles.decorator';
import { QueryEnum, QueryInt, QueryStr } from '../common/decorators/query-params.decorator';
import { SituacaoCobranca } from '../generated/prisma/client';
import { CobrancaService } from './cobranca.service';
import { CreateCobrancaDto, UpdateCobrancaDto } from './cobranca.dto';

@Controller('cobrancas')
@ApiTags('cobrancas')
@ApiBearerAuth()
export class CobrancaController {
  constructor(private readonly service: CobrancaService) {}

  @Post()
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Cadastrar cobrança (SINDICO)' })
  create(@Body() dto: CreateCobrancaDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cobranças (morador: só as do(s) seu(s) imóvel(is))' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false, description: 'padrão 20, máximo 500' })
  @ApiQuery({ name: 'status', required: false, description: '1 = ativas, 0 = canceladas' })
  @ApiQuery({ name: 'situacao', required: false, enum: SituacaoCobranca })
  @ApiQuery({ name: 'imovelId', required: false })
  @ApiQuery({ name: 'busca', required: false, description: 'texto na descrição' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @QueryInt('page') page?: number,
    @QueryInt('pageSize') pageSize?: number,
    @QueryInt('status') status?: number,
    @QueryEnum({ nome: 'situacao', valores: Object.values(SituacaoCobranca) }) situacao?: SituacaoCobranca,
    @QueryInt('imovelId') imovelId?: number,
    @QueryStr('busca') busca?: string,
  ) {
    return this.service.findAll(user, { page, pageSize, status, situacao, imovelId, busca });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar cobrança pelo ID (com boleto e pagamentos)' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Alterar cobrança (SINDICO)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCobrancaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Cancelar cobrança: fica inativa (status = 0), não é apagada (SINDICO)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
