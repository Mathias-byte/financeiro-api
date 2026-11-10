import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/jwt-payload';
import { recalcularSituacao } from '../cobrancas/situacao';
import { normalizarPagina, ParamsPagina, respostaPaginada } from '../common/paginacao';
import { FormaPagamento, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePagamentoDto, UpdatePagamentoDto } from './pagamento.dto';

export interface FiltrosPagamento extends ParamsPagina {
  status?: number;
  cobrancaId?: number;
  imovelId?: number;
  formaPagamento?: FormaPagamento;
}

const COM_COBRANCA = {
  cobranca: { select: { id: true, imovelId: true, competencia: true, valor: true, vencimento: true, situacao: true } },
} as const;

// MORADOR só enxerga pagamentos de cobranças dos imóveis que estão no token.
function escopo(user: JwtPayload): Prisma.PagamentoWhereInput {
  return user.usuarioPerfil === 'SINDICO' ? {} : { cobranca: { imovelId: { in: user.imovelIds ?? [] } } };
}

@Injectable()
export class PagamentoService {
  constructor(private readonly prisma: PrismaService) {}

  // Registrar o pagamento e atualizar a situação da cobrança acontecem juntos (transação).
  async create(dto: CreatePagamentoDto) {
    return this.prisma.$transaction(async (tx) => {
      const cobranca = await tx.cobranca.findUnique({ where: { id: dto.cobrancaId } });
      if (!cobranca) throw new BadRequestException('A cobrança informada não existe.');
      if (cobranca.status === 0 || cobranca.situacao === 'CANCELADO') {
        throw new ConflictException('Cobrança cancelada não aceita pagamentos.');
      }
      const criado = await tx.pagamento.create({
        data: {
          cobrancaId: dto.cobrancaId,
          valorPago: dto.valorPago,
          dataPagamento: new Date(dto.dataPagamento),
          formaPagamento: dto.formaPagamento,
          observacao: dto.observacao,
          status: dto.status ?? 1,
        },
      });
      await recalcularSituacao(tx, dto.cobrancaId);
      return tx.pagamento.findUniqueOrThrow({ where: { id: criado.id }, include: COM_COBRANCA });
    });
  }

  async findAll(user: JwtPayload, f: FiltrosPagamento) {
    const { page, pageSize, skip, take } = normalizarPagina(f);
    const where: Prisma.PagamentoWhereInput = {
      AND: [
        escopo(user),
        f.status !== undefined ? { status: f.status } : {},
        f.cobrancaId !== undefined ? { cobrancaId: f.cobrancaId } : {},
        f.imovelId !== undefined ? { cobranca: { imovelId: f.imovelId } } : {},
        f.formaPagamento ? { formaPagamento: f.formaPagamento } : {},
      ],
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.pagamento.findMany({ where, skip, take, orderBy: [{ dataPagamento: 'desc' }, { id: 'desc' }], include: COM_COBRANCA }),
      this.prisma.pagamento.count({ where }),
    ]);
    return respostaPaginada(data, total, page, pageSize);
  }

  async findOne(user: JwtPayload, id: number) {
    const item = await this.prisma.pagamento.findFirst({ where: { id, ...escopo(user) }, include: COM_COBRANCA });
    if (!item) throw new NotFoundException(`Pagamento #${id} não encontrado.`);
    return item;
  }

  async update(id: number, dto: UpdatePagamentoDto) {
    return this.prisma.$transaction(async (tx) => {
      const atual = await tx.pagamento.findUnique({ where: { id } });
      if (!atual) throw new NotFoundException(`Pagamento #${id} não encontrado.`);
      await tx.pagamento.update({
        where: { id },
        data: {
          ...(dto.valorPago !== undefined ? { valorPago: dto.valorPago } : {}),
          ...(dto.dataPagamento !== undefined ? { dataPagamento: new Date(dto.dataPagamento) } : {}),
          ...(dto.formaPagamento !== undefined ? { formaPagamento: dto.formaPagamento } : {}),
          ...(dto.observacao !== undefined ? { observacao: dto.observacao } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
      });
      await recalcularSituacao(tx, atual.cobrancaId);
      return tx.pagamento.findUniqueOrThrow({ where: { id }, include: COM_COBRANCA });
    });
  }

  // O pagamento fica inativo (pagamento_status = 0) e a cobrança é reavaliada.
  async remove(id: number) {
    return this.update(id, { status: 0 });
  }
}
