import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { QueryInt, QueryStr } from '../common/decorators/query-params.decorator';
import { ReceitaService } from './receita.service';
import { CreateReceitaDto, UpdateReceitaDto } from './receita.dto';

// Contabilidade interna do condomínio: só o síndico acessa (leitura e escrita).
@Controller('receitas')
@ApiTags('receitas')
@ApiBearerAuth()
@Roles('SINDICO')
export class ReceitaController {
  constructor(private readonly service: ReceitaService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar receita' })
  create(@Body() dto: CreateReceitaDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar receitas' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false, description: 'padrão 20, máximo 500' })
  @ApiQuery({ name: 'status', required: false, description: '1 = ativas, 0 = inativas' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'busca', required: false, description: 'texto na descrição' })
  findAll(
    @QueryInt('page') page?: number,
    @QueryInt('pageSize') pageSize?: number,
    @QueryInt('status') status?: number,
    @QueryStr('categoria') categoria?: string,
    @QueryStr('busca') busca?: string,
  ) {
    return this.service.findAll({ page, pageSize, status, categoria, busca });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar receita pelo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Alterar receita' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReceitaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Inativar receita: fica com status = 0, não é apagada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
