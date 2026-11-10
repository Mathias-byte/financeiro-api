import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../generated/prisma/client';

// Rede de segurança: erros do Prisma que escaparem dos services viram uma resposta HTTP legível,
// sem vazar nome de tabela/coluna nem texto da consulta.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapa: Record<string, [number, string]> = {
      P2002: [HttpStatus.CONFLICT, 'Já existe um registro com estes campos únicos.'],
      P2003: [HttpStatus.BAD_REQUEST, 'A cobrança informada não existe ou o registro possui vínculos que impedem esta operação.'],
      P2025: [HttpStatus.NOT_FOUND, 'Registro não encontrado.'],
    };
    const [statusCode, message] = mapa[exception.code] ?? [HttpStatus.INTERNAL_SERVER_ERROR, 'Falha ao acessar o banco de dados.'];
    host.switchToHttp().getResponse<Response>().status(statusCode).json({ statusCode, message, error: exception.code });
  }
}
