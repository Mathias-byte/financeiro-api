import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizarPagina, ParamsPagina, respostaPaginada } from '../common/paginacao';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReceitaDto, UpdateReceitaDto } from './receita.dto';

export interface FiltrosReceita extends ParamsPagina {
  status?: number;
  categoria?: string;
  busca?: string;
}

@Injectable()
export class ReceitaService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateReceitaDto) {
    return this.prisma.receita.create({
      data: {
        descricao: dto.descricao,
        valor: dto.valor,
        data: new Date(dto.data),
        categoria: dto.categoria,
        status: dto.status ?? 1,
      },
    });
  }

  async findAll(f: FiltrosReceita) {
    const { page, pageSize, skip, take } = normalizarPagina(f);
    const where: Prisma.ReceitaWhereInput = {
      AND: [
        f.status !== undefined ? { status: f.status } : {},
        f.categoria ? { categoria: f.categoria } : {},
        f.busca ? { OR: [{ descricao: { contains: f.busca } }] } : {},
      ],
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.receita.findMany({ where, skip, take, orderBy: [{ data: 'desc' }, { id: 'desc' }] }),
      this.prisma.receita.count({ where }),
    ]);
    return respostaPaginada(data, total, page, pageSize);
  }

  async findOne(id: number) {
    const item = await this.prisma.receita.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Receita #${id} não encontrada.`);
    return item;
  }

  async update(id: number, dto: UpdateReceitaDto) {
    await this.findOne(id);
    return this.prisma.receita.update({
      where: { id },
      data: {
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
        ...(dto.data !== undefined ? { data: new Date(dto.data) } : {}),
        ...(dto.categoria !== undefined ? { categoria: dto.categoria } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  // Dado financeiro não é apagado: fica inativo (receita_status = 0).
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.receita.update({ where: { id }, data: { status: 0 } });
  }
}
