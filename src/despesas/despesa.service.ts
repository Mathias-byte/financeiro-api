import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizarPagina, ParamsPagina, respostaPaginada } from '../common/paginacao';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDespesaDto, UpdateDespesaDto } from './despesa.dto';

export interface FiltrosDespesa extends ParamsPagina {
  status?: number;
  categoria?: string;
  busca?: string;
}

@Injectable()
export class DespesaService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateDespesaDto) {
    return this.prisma.despesa.create({
      data: {
        descricao: dto.descricao,
        fornecedor: dto.fornecedor,
        valor: dto.valor,
        data: new Date(dto.data),
        categoria: dto.categoria,
        status: dto.status ?? 1,
      },
    });
  }

  async findAll(f: FiltrosDespesa) {
    const { page, pageSize, skip, take } = normalizarPagina(f);
    const where: Prisma.DespesaWhereInput = {
      AND: [
        f.status !== undefined ? { status: f.status } : {},
        f.categoria ? { categoria: f.categoria } : {},
        f.busca ? { OR: [{ descricao: { contains: f.busca } }, { fornecedor: { contains: f.busca } }] } : {},
      ],
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.despesa.findMany({ where, skip, take, orderBy: [{ data: 'desc' }, { id: 'desc' }] }),
      this.prisma.despesa.count({ where }),
    ]);
    return respostaPaginada(data, total, page, pageSize);
  }

  async findOne(id: number) {
    const item = await this.prisma.despesa.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Despesa #${id} não encontrada.`);
    return item;
  }

  async update(id: number, dto: UpdateDespesaDto) {
    await this.findOne(id);
    return this.prisma.despesa.update({
      where: { id },
      data: {
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
        ...(dto.fornecedor !== undefined ? { fornecedor: dto.fornecedor } : {}),
        ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
        ...(dto.data !== undefined ? { data: new Date(dto.data) } : {}),
        ...(dto.categoria !== undefined ? { categoria: dto.categoria } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  // Dado financeiro não é apagado: fica inativo (despesa_status = 0).
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.despesa.update({ where: { id }, data: { status: 0 } });
  }
}
