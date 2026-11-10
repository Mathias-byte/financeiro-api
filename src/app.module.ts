import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BoletoModule } from './boletos/boleto.module';
import { CobrancaModule } from './cobrancas/cobranca.module';
import { DespesaModule } from './despesas/despesa.module';
import { HealthModule } from './health/health.module';
import { PagamentoModule } from './pagamentos/pagamento.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReceitaModule } from './receitas/receita.module';

@Module({
  imports: [PrismaModule, AuthModule, HealthModule, CobrancaModule, BoletoModule, PagamentoModule, ReceitaModule, DespesaModule],
})
export class AppModule {}
