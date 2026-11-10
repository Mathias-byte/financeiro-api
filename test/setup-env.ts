// Variáveis fixas para os testes (carregado antes de qualquer import do app: a JwtStrategy lê JWT_SECRET ao ser criada).
import { Logger } from '@nestjs/common';

Logger.overrideLogger(false);

process.env.JWT_SECRET = 'segredo-de-teste';
process.env.NODE_ENV = 'test';
