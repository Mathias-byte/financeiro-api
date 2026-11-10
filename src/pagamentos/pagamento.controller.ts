import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { Roles } from '../auth/roles.decorator';
import { QueryEnum, QueryInt } from '../common/decorators/query-params.decorator';
import { FormaPagamento } from '../generated/prisma/client';
import { PagamentoService } from './pagamento.service';
import { CreatePagamentoDto, UpdatePagamentoDto } from './pagamento.dto';

@Controller('pagamentos')
@ApiTags('pagamentos')
@ApiBearerAuth()
export class PagamentoController {
  constructor(private readonly service: PagamentoService) {}

  @Post()
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Registrar pagamento; atualiza a situação da cobrança (SINDICO)' })
  create(@Body() dto: CreatePagamentoDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pagamentos (morador: só os do(s) seu(s) imóvel(is))' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false, description: 'padrão 20, máximo 500' })
  @ApiQuery({ name: 'status', required: false, description: '1 = ativos, 0 = cancelados' })
  @ApiQuery({ name: 'cobrancaId', required: false })
  @ApiQuery({ name: 'imovelId', required: false, description: 'pagamentos das cobranças deste imóvel' })
  @ApiQuery({ name: 'formaPagamento', required: false, enum: FormaPagamento })
  findAll(
    @CurrentUser() user: JwtPayload,
    @QueryInt('page') page?: number,
    @QueryInt('pageSize') pageSize?: number,
    @QueryInt('status') status?: number,
    @QueryInt('cobrancaId') cobrancaId?: number,
    @QueryInt('imovelId') imovelId?: number,
    @QueryEnum({ nome: 'formaPagamento', valores: Object.values(FormaPagamento) }) formaPagamento?: FormaPagamento,
  ) {
    return this.service.findAll(user, { page, pageSize, status, cobrancaId, imovelId, formaPagamento });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar pagamento pelo ID' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(user, id);
  }

  @Patch(':id')
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Alterar pagamento (SINDICO); a cobrança é reavaliada' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePagamentoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('SINDICO')
  @ApiOperation({ summary: 'Cancelar pagamento: fica inativo (status = 0) e a cobrança é reavaliada (SINDICO)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
