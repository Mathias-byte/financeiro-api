import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PREFIXO_API } from './app.constants';
import { configureApp } from './app.setup';
import { swaggerHabilitado } from './swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // permite encerrar com SIGTERM (docker stop): fecha o banco antes de sair
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 7523;
  // 0.0.0.0: dentro do Docker, escutar só em 127.0.0.1 deixaria a API inalcançável de fora do container
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`MS Financeiro rodando em http://localhost:${port}/${PREFIXO_API}`);
  // eslint-disable-next-line no-console
  console.log(`Health check em http://localhost:${port}/${PREFIXO_API}/health`);
  // eslint-disable-next-line no-console
  console.log(
    swaggerHabilitado()
      ? `Swagger em http://localhost:${port}/${PREFIXO_API}/docs`
      : 'Swagger desativado (produção). Para ligar, defina SWAGGER_ENABLED=true.',
  );
}
bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
