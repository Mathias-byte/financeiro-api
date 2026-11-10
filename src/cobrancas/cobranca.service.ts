import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/jwt-payload';
import { normalizarPagina, ParamsPagina, respostaPaginada } from '../common/paginacao';
import { Prisma, SituacaoCobranca } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCobrancaDto, UpdateCobrancaDto } from './cobranca.dto';
import { recalcularSituacao } from './situacao';

export interface FiltrosCobranca extends ParamsPagina {
  status?: number;
  situacao?: SituacaoCobranca;
  imovelId?: number;
  busca?: string;
}

// MORADOR só enxerga cobranças dos imóveis que estão no token; SINDICO enxerga todas.
export function escopoImoveis(user: JwtPayload): Prisma.CobrancaWhereInput {
  return user.usuarioPerfil === 'SINDICO' ? {} : { imovelId: { in: user.imovelIds ?? [] } };
}

@Injectable()
export class CobrancaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCobrancaDto) {
    try {
      return await this.prisma.cobranca.create({
        data: {
          imovelId: dto.imovelId,
          descricao: dto.descricao,
          competencia: new Date(dto.competencia),
          valor: dto.valor,
          vencimento: new Date(dto.vencimento),
          situacao: dto.situacao ?? 'PENDENTE',
          status: dto.status ?? 1,
        },
        include: { boleto: true },
      });
    } catch (e) {
      this.tratarUnicidade(e);
    }
  }

  async findAll(user: JwtPayload, f: FiltrosCobranca) {
    const { page, pageSize, skip, take } = normalizarPagina(f);
    const where: Prisma.CobrancaWhereInput = {
      AND: [
        escopoImoveis(user),
        f.status !== undefined ? { status: f.status } : {},
        f.situacao ? { situacao: f.situacao } : {},
        f.imovelId !== undefined ? { imovelId: f.imovelId } : {},
        f.busca ? { descricao: { contains: f.busca } } : {},
      ],
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.cobranca.findMany({
        where,
        skip,
        take,
        orderBy: [{ competencia: 'desc' }, { id: 'desc' }],
        include: { boleto: true },
      }),
      this.prisma.cobranca.count({ where }),
    ]);
    return respostaPaginada(data, total, page, pageSize);
  }

  // Cobrança de outro imóvel responde 404 (e não 403) para o morador não descobrir que ela existe.
  async findOne(user: JwtPayload, id: number) {
    const item = await this.prisma.cobranca.findFirst({
      where: { id, ...escopoImoveis(user) },
      include: { boleto: true, pagamentos: { orderBy: { dataPagamento: 'desc' } } },
    });
    if (!item) throw new NotFoundException(`Cobrança #${id} não encontrada.`);
    return item;
  }

  async update(id: number, dto: UpdateCobrancaDto) {
    await this.existe(id);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const atualizada = await tx.cobranca.update({
          where: { id },
          data: {
            ...(dto.imovelId !== undefined ? { imovelId: dto.imovelId } : {}),
            ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
            ...(dto.competencia !== undefined ? { competencia: new Date(dto.competencia) } : {}),
            ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
            ...(dto.vencimento !== undefined ? { vencimento: new Date(dto.vencimento) } : {}),
            ...(dto.situacao !== undefined ? { situacao: dto.situacao } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
          },
        });
        // mudou o valor sem o síndico escolher a situação: reavalia contra os pagamentos já feitos
        if (dto.valor !== undefined && dto.situacao === undefined) await recalcularSituacao(tx, id);
        return tx.cobranca.findUniqueOrThrow({ where: { id: atualizada.id }, include: { boleto: true } });
      });
    } catch (e) {
      this.tratarUnicidade(e);
    }
  }

  // Dado financeiro não é apagado: a cobrança fica inativa (cobranca_status = 0), como nos outros recursos.
  async remove(id: number) {
    await this.existe(id);
    return this.prisma.cobranca.update({ where: { id }, data: { status: 0 }, include: { boleto: true } });
  }

  private async existe(id: number) {
    const c = await this.prisma.cobranca.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException(`Cobrança #${id} não encontrada.`);
  }

  private tratarUnicidade(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Já existe uma cobrança para este imóvel nesta competência.');
    }
    throw e;
  }
}
