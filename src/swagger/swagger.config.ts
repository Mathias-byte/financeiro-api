import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PREFIXO_API } from '../app.constants';

// Swagger fica DESLIGADO em produção (a imagem Docker roda com NODE_ENV=production), porque a página
// expõe toda a API. SWAGGER_ENABLED=true liga em qualquer ambiente (ex.: demonstração);
// false desliga; vazio = liga só fora de produção.
export function swaggerHabilitado(env: NodeJS.ProcessEnv = process.env): boolean {
  const valor = env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (valor === 'true' || valor === '1') return true;
  if (valor === 'false' || valor === '0') return false;
  return env.NODE_ENV !== 'production';
}

export function setupSwagger(app: INestApplication) {
  if (!swaggerHabilitado()) return;
  const config = new DocumentBuilder()
    .setTitle('PropTech — MS Financeiro')
    .setDescription(
      [
        'Cobranças, boletos, pagamentos, receitas e despesas do condomínio.',
        '',
        '**Autenticação**',
        '- O token vem do **MS Moradores** (`POST /condominio/morador/auth/login`). Cole-o em *Authorize*.',
        '- `SINDICO` lê e altera tudo. `MORADOR` só **lê** cobranças, boletos e pagamentos dos imóveis da sua relação; receitas e despesas são só do síndico.',
        '- Tokens emitidos antes da atualização do Moradores não trazem os imóveis: o morador precisa entrar de novo.',
        '',
        '**Convenções**',
        '- Listagens: `?page=1&pageSize=20` (máx. 500) → `{ data, total, page, pageSize, totalPages }`.',
        '- `DELETE` não apaga: o registro fica inativo (`status = 0`). Valores monetários voltam como texto (`"500.00"`).',
        '- Registrar um pagamento atualiza a situação da cobrança (PAGO quando a soma cobre o valor).',
        '',
        '**Disponibilidade desta documentação**',
        '- Esta página fica ligada fora de produção. Em produção (imagem Docker e servidor) ela só aparece com `SWAGGER_ENABLED=true`.',
        '- Ligou para uma demonstração? Desligue depois (remova a variável e recrie o container): a página expõe toda a API.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(`${PREFIXO_API}/docs`, app, SwaggerModule.createDocument(app, config));
}
