import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PREFIXO_API } from './app.constants';
import { accessLog } from './common/logging/access-log.middleware';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import { setupSwagger } from './swagger/swagger.config';

// Configuração compartilhada entre a aplicação real (main.ts) e os testes e2e.
export function configureApp(app: INestApplication) {
  app.enableCors();

  // log de acesso (quem, o quê, quando, de onde); nos testes fica desligado para não poluir a saída
  if (process.env.NODE_ENV !== 'test') app.use(accessLog);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.setGlobalPrefix(PREFIXO_API);

  // Documentação interativa em /condominio/financeiro/docs — só quando habilitada
  setupSwagger(app);
}
