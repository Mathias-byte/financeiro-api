import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/jwt-payload';
import { normalizarPagina, ParamsPagina, respostaPaginada } from '../common/paginacao';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoletoDto, UpdateBoletoDto } from './boleto.dto';

export interface FiltrosBoleto extends ParamsPagina {
  status?: number;
  cobrancaId?: number;
  imovelId?: number;
}

const COM_COBRANCA = {
  cobranca: { select: { id: true, imovelId: true, competencia: true, valor: true, vencimento: true, situacao: true } },
} as const;

function escopo(user: JwtPayload): Prisma.BoletoWhereInput {
  return user.usuarioPerfil === 'SINDICO' ? {} : { cobranca: { imovelId: { in: user.imovelIds ?? [] } } };
}

// Boleto aqui é só um cadastro (linha digitável, código de barras e link do PDF): não há emissão bancária.
@Injectable()
export class BoletoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBoletoDto) {
    const cobranca = await this.prisma.cobranca.findUnique({ where: { id: dto.cobrancaId }, select: { id: true } });
    if (!cobranca) throw new BadRequestException('A cobrança informada não existe.');
    try {
      return await this.prisma.boleto.create({
        data: {
          cobrancaId: dto.cobrancaId,
          codigoBarras: dto.codigoBarras,
          linhaDigitavel: dto.linhaDigitavel,
          urlPdf: dto.urlPdf,
          status: dto.status ?? 1,
        },
        include: COM_COBRANCA,
      });
    } catch (e) {
      this.tratarUnicidade(e);
    }
  }

  async findAll(user: JwtPayload, f: FiltrosBoleto) {
    const { page, pageSize, skip, take } = normalizarPagina(f);
    const where: Prisma.BoletoWhereInput = {
      AND: [
        escopo(user),
        f.status !== undefined ? { status: f.status } : {},
        f.cobrancaId !== undefined ? { cobrancaId: f.cobrancaId } : {},
        f.imovelId !== undefined ? { cobranca: { imovelId: f.imovelId } } : {},
      ],
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.boleto.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: COM_COBRANCA }),
      this.prisma.boleto.count({ where }),
    ]);
    return respostaPaginada(data, total, page, pageSize);
  }

  async findOne(user: JwtPayload, id: number) {
    const item = await this.prisma.boleto.findFirst({ where: { id, ...escopo(user) }, include: COM_COBRANCA });
    if (!item) throw new NotFoundException(`Boleto #${id} não encontrado.`);
    return item;
  }

  async update(id: number, dto: UpdateBoletoDto) {
    const atual = await this.prisma.boleto.findUnique({ where: { id }, select: { id: true } });
    if (!atual) throw new NotFoundException(`Boleto #${id} não encontrado.`);
    try {
      return await this.prisma.boleto.update({
        where: { id },
        data: {
          ...(dto.codigoBarras !== undefined ? { codigoBarras: dto.codigoBarras } : {}),
          ...(dto.linhaDigitavel !== undefined ? { linhaDigitavel: dto.linhaDigitavel } : {}),
          ...(dto.urlPdf !== undefined ? { urlPdf: dto.urlPdf } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
        },
        include: COM_COBRANCA,
      });
    } catch (e) {
      this.tratarUnicidade(e);
    }
  }

  // Fica inativo (boleto_status = 0). A cobrança continua com o mesmo registro: para reemitir, edite o boleto.
  async remove(id: number) {
    return this.update(id, { status: 0 });
  }

  private tratarUnicidade(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Esta cobrança já tem boleto, ou a linha digitável já está em uso por outro boleto.');
    }
    throw e;
  }
}
