import 'dotenv/config';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

// Centraliza a conexão com o banco condominio_financeiro.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL não definida. Defina no Infisical (ou no .env).');
    }
    super({ adapter: new PrismaMariaDb(url) });
  }

  // O adapter só abre a conexão na primeira consulta; o SELECT 1 força a conexão agora, para a API
  // NÃO subir com o banco fora do ar (o motivo aparece no log em vez de um 500 na primeira chamada).
  async onModuleInit() {
    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
    } catch (e) {
      this.logger.error(`Não foi possível conectar ao banco: ${e instanceof Error ? e.message : e}`);
      throw e;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
