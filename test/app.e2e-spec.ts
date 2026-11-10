import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock } from './helpers/prisma-mock';
import { gerarToken } from './helpers/token';

// Testes HTTP: sobem o AppModule inteiro com a configuração real (prefixo, guards, validação),
// trocando só o banco por um mock.
describe('MS Financeiro (e2e)', () => {
  let app: INestApplication;
  let prisma: any;
  const B = '/condominio/financeiro';

  const sindico = () => ({ Authorization: `Bearer ${gerarToken({ sub: 1, usuarioId: 1, moradorId: null, usuarioPerfil: 'SINDICO' })}` });
  const morador = (imovelIds?: number[]) => ({
    Authorization: `Bearer ${gerarToken({ sub: 2, usuarioId: 2, moradorId: 7, usuarioPerfil: 'MORADOR', ...(imovelIds ? { imovelIds } : {}) })}`,
  });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);
    prisma.cobranca.findMany.mockResolvedValue([]);
    prisma.cobranca.count.mockResolvedValue(0);
  });

  describe('autenticação', () => {
    it('sem token → 401', async () => {
      await http().get(`${B}/cobrancas`).expect(401);
      await http().get(`${B}/receitas`).expect(401);
    });
    it('token com outro segredo → 401', async () => {
      const t = gerarToken({ usuarioId: 1, usuarioPerfil: 'SINDICO' }, { segredo: 'outro-segredo' });
      await http().get(`${B}/cobrancas`).set('Authorization', `Bearer ${t}`).expect(401);
    });
    it('token expirado → 401', async () => {
      const t = gerarToken({ usuarioId: 1, usuarioPerfil: 'SINDICO' }, { expiraEm: -10 });
      await http().get(`${B}/cobrancas`).set('Authorization', `Bearer ${t}`).expect(401);
    });
    it('token com perfil desconhecido → 401', async () => {
      const t = gerarToken({ usuarioId: 1, usuarioPerfil: 'ADMIN' });
      await http().get(`${B}/cobrancas`).set('Authorization', `Bearer ${t}`).expect(401);
    });
    it('rota fora do prefixo não existe', async () => {
      await http().get('/cobrancas').set(sindico()).expect(404);
    });
  });

  describe('/health', () => {
    it('é público e responde 200 com o banco no ar', async () => {
      const res = await http().get(`${B}/health`).expect(200);
      expect(res.body).toEqual({ status: 'Healthy', checks: { api: 'up', database: 'up' } });
    });
    it('responde 503 sem vazar detalhes quando o banco cai', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error("Access denied for user 'x'@'10.0.0.1'"));
      const res = await http().get(`${B}/health`).expect(503);
      expect(res.body.status).toBe('Unhealthy');
      expect(JSON.stringify(res.body)).not.toContain('Access denied');
    });
  });

  describe('perfis', () => {
    it('MORADOR não grava nada → 403', async () => {
      await http().post(`${B}/cobrancas`).set(morador([1])).send({}).expect(403);
      await http().patch(`${B}/cobrancas/1`).set(morador([1])).send({}).expect(403);
      await http().delete(`${B}/cobrancas/1`).set(morador([1])).expect(403);
      await http().post(`${B}/pagamentos`).set(morador([1])).send({}).expect(403);
      await http().post(`${B}/boletos`).set(morador([1])).send({}).expect(403);
    });
    it('MORADOR não vê receitas nem despesas → 403', async () => {
      await http().get(`${B}/receitas`).set(morador([1])).expect(403);
      await http().get(`${B}/despesas`).set(morador([1])).expect(403);
      await http().get(`${B}/despesas/1`).set(morador([1])).expect(403);
    });
    it('MORADOR lista só cobranças dos imóveis do token', async () => {
      await http().get(`${B}/cobrancas?imovelId=99`).set(morador([3, 4])).expect(200);
      const where = prisma.cobranca.findMany.mock.calls[0][0].where;
      expect(where.AND).toEqual(expect.arrayContaining([{ imovelId: { in: [3, 4] } }, { imovelId: 99 }]));
    });
    it('MORADOR com token antigo (sem imovelIds) não vê nada', async () => {
      await http().get(`${B}/cobrancas`).set(morador()).expect(200);
      expect(prisma.cobranca.findMany.mock.calls[0][0].where.AND).toContainEqual({ imovelId: { in: [] } });
    });
    it('SINDICO lista tudo, sem filtro de imóvel', async () => {
      await http().get(`${B}/cobrancas`).set(sindico()).expect(200);
      expect(prisma.cobranca.findMany.mock.calls[0][0].where.AND).toContainEqual({});
      expect(JSON.stringify(prisma.cobranca.findMany.mock.calls[0][0].where)).not.toContain('"in"');
    });
    it('MORADOR consultando cobrança de outro imóvel → 404 (não revela que existe)', async () => {
      prisma.cobranca.findFirst.mockResolvedValue(null);
      await http().get(`${B}/cobrancas/10`).set(morador([3])).expect(404);
      expect(prisma.cobranca.findFirst.mock.calls[0][0].where).toEqual({ id: 10, imovelId: { in: [3] } });
    });
    it('pagamentos e boletos filtram por imóvel (via cobrança), junto com o escopo do morador', async () => {
      await http().get(`${B}/pagamentos?imovelId=3`).set(morador([3, 4])).expect(200);
      expect(prisma.pagamento.findMany.mock.calls[0][0].where.AND).toEqual(
        expect.arrayContaining([{ cobranca: { imovelId: { in: [3, 4] } } }, { cobranca: { imovelId: 3 } }]),
      );
      await http().get(`${B}/boletos?imovelId=3`).set(sindico()).expect(200);
      expect(prisma.boleto.findMany.mock.calls[0][0].where.AND).toContainEqual({ cobranca: { imovelId: 3 } });
    });
    it('MORADOR vê pagamentos e boletos só dos seus imóveis', async () => {
      await http().get(`${B}/pagamentos`).set(morador([3])).expect(200);
      expect(prisma.pagamento.findMany.mock.calls[0][0].where.AND).toContainEqual({ cobranca: { imovelId: { in: [3] } } });
      await http().get(`${B}/boletos`).set(morador([3])).expect(200);
      expect(prisma.boleto.findMany.mock.calls[0][0].where.AND).toContainEqual({ cobranca: { imovelId: { in: [3] } } });
    });
  });

  describe('listagem', () => {
    it('devolve { data, total, page, pageSize, totalPages }', async () => {
      prisma.cobranca.findMany.mockResolvedValue([{ id: 1 }]);
      prisma.cobranca.count.mockResolvedValue(41);
      const res = await http().get(`${B}/cobrancas?page=2&pageSize=20`).set(sindico()).expect(200);
      expect(res.body).toEqual({ data: [{ id: 1 }], total: 41, page: 2, pageSize: 20, totalPages: 3 });
      expect(prisma.cobranca.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 20 }));
    });
    it('pageSize é limitado a 500', async () => {
      await http().get(`${B}/cobrancas?pageSize=9999`).set(sindico()).expect(200);
      expect(prisma.cobranca.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 500 }));
    });
    it('filtros inválidos → 400', async () => {
      await http().get(`${B}/cobrancas?situacao=XYZ`).set(sindico()).expect(400);
      await http().get(`${B}/cobrancas?page=abc`).set(sindico()).expect(400);
      await http().get(`${B}/pagamentos?formaPagamento=CHEQUE`).set(sindico()).expect(400);
    });
    it('aplica situacao, status e busca', async () => {
      await http().get(`${B}/cobrancas?situacao=PAGO&status=1&busca=taxa`).set(sindico()).expect(200);
      const and = prisma.cobranca.findMany.mock.calls[0][0].where.AND;
      expect(and).toEqual(expect.arrayContaining([{ status: 1 }, { situacao: 'PAGO' }, { descricao: { contains: 'taxa' } }]));
    });
  });

  describe('cobranças', () => {
    const valida = { imovelId: 1, descricao: 'Taxa', competencia: '2026-11-01', valor: 850, vencimento: '2026-11-10' };

    it('cria com status 1 e situação PENDENTE por padrão', async () => {
      prisma.cobranca.create.mockResolvedValue({ id: 5 });
      await http().post(`${B}/cobrancas`).set(sindico()).send(valida).expect(201);
      const data = prisma.cobranca.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ imovelId: 1, valor: 850, situacao: 'PENDENTE', status: 1 });
      expect(data.competencia).toEqual(new Date('2026-11-01'));
    });
    it.each([
      ['valor negativo', { valor: -1 }],
      ['mais de 2 casas', { valor: 10.123 }],
      ['data impossível', { competencia: '2026-02-30' }],
      ['campo extra', { extra: true }],
      ['situação inválida', { situacao: 'QUITADO' }],
      ['status fora de 0/1', { status: 5 }],
    ])('rejeita %s → 400', async (_n, extra) => {
      await http().post(`${B}/cobrancas`).set(sindico()).send({ ...valida, ...extra }).expect(400);
      expect(prisma.cobranca.create).not.toHaveBeenCalled();
    });
    it('imóvel+competência repetidos → 409 com mensagem clara', async () => {
      prisma.cobranca.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('x', { code: 'P2002', clientVersion: '7' }));
      const res = await http().post(`${B}/cobrancas`).set(sindico()).send(valida).expect(409);
      expect(res.body.message).toMatch(/imóvel nesta competência/);
    });
    it('DELETE inativa (status 0) em vez de apagar', async () => {
      prisma.cobranca.findUnique.mockResolvedValue({ id: 5 });
      prisma.cobranca.update.mockResolvedValue({ id: 5, status: 0 });
      await http().delete(`${B}/cobrancas/5`).set(sindico()).expect(200);
      expect(prisma.cobranca.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 }, data: { status: 0 } }));
    });
    it('PATCH em cobrança inexistente → 404', async () => {
      prisma.cobranca.findUnique.mockResolvedValue(null);
      await http().patch(`${B}/cobrancas/9`).set(sindico()).send({ descricao: 'x' }).expect(404);
    });
    it('id não numérico → 400', async () => {
      await http().get(`${B}/cobrancas/abc`).set(sindico()).expect(400);
    });
  });

  describe('pagamentos', () => {
    const valido = { cobrancaId: 5, valorPago: 850, dataPagamento: '2026-11-05T12:00:00.000Z', formaPagamento: 'PIX' };
    const cobranca = (extra: any = {}) => ({ id: 5, valor: new Prisma.Decimal(850), situacao: 'PENDENTE', status: 1, vencimento: new Date('2099-01-10'), ...extra });

    it('cobrança inexistente → 400', async () => {
      prisma.cobranca.findUnique.mockResolvedValue(null);
      await http().post(`${B}/pagamentos`).set(sindico()).send(valido).expect(400);
      expect(prisma.pagamento.create).not.toHaveBeenCalled();
    });
    it('cobrança cancelada não aceita pagamento → 409', async () => {
      prisma.cobranca.findUnique.mockResolvedValue(cobranca({ situacao: 'CANCELADO' }));
      await http().post(`${B}/pagamentos`).set(sindico()).send(valido).expect(409);
      prisma.cobranca.findUnique.mockResolvedValue(cobranca({ status: 0 }));
      await http().post(`${B}/pagamentos`).set(sindico()).send(valido).expect(409);
    });
    it('registrar o pagamento quita a cobrança (PAGO)', async () => {
      prisma.cobranca.findUnique.mockResolvedValue(cobranca());
      prisma.pagamento.create.mockResolvedValue({ id: 9 });
      prisma.pagamento.aggregate.mockResolvedValue({ _sum: { valorPago: new Prisma.Decimal(850) } });
      prisma.pagamento.findUniqueOrThrow.mockResolvedValue({ id: 9 });
      await http().post(`${B}/pagamentos`).set(sindico()).send(valido).expect(201);
      expect(prisma.pagamento.create.mock.calls[0][0].data).toMatchObject({ cobrancaId: 5, valorPago: 850, status: 1 });
      expect(prisma.cobranca.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { situacao: 'PAGO' } });
    });
    it('cancelar o pagamento reabre a cobrança', async () => {
      prisma.pagamento.findUnique.mockResolvedValue({ id: 9, cobrancaId: 5 });
      prisma.pagamento.update.mockResolvedValue({});
      prisma.pagamento.findUniqueOrThrow.mockResolvedValue({ id: 9, status: 0 });
      prisma.cobranca.findUnique.mockResolvedValue(cobranca({ situacao: 'PAGO' }));
      prisma.pagamento.aggregate.mockResolvedValue({ _sum: { valorPago: null } });
      await http().delete(`${B}/pagamentos/9`).set(sindico()).expect(200);
      expect(prisma.pagamento.update).toHaveBeenCalledWith({ where: { id: 9 }, data: { status: 0 } });
      expect(prisma.cobranca.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { situacao: 'PENDENTE' } });
    });
    it('não permite trocar a cobrança de um pagamento (campo extra → 400)', async () => {
      await http().patch(`${B}/pagamentos/9`).set(sindico()).send({ cobrancaId: 6 }).expect(400);
    });
    it('forma de pagamento inválida → 400', async () => {
      await http().post(`${B}/pagamentos`).set(sindico()).send({ ...valido, formaPagamento: 'CHEQUE' }).expect(400);
    });
  });

  describe('boletos', () => {
    it('cobrança inexistente → 400', async () => {
      prisma.cobranca.findUnique.mockResolvedValue(null);
      await http().post(`${B}/boletos`).set(sindico()).send({ cobrancaId: 5 }).expect(400);
    });
    it('segundo boleto na mesma cobrança → 409', async () => {
      prisma.cobranca.findUnique.mockResolvedValue({ id: 5 });
      prisma.boleto.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('x', { code: 'P2002', clientVersion: '7' }));
      const res = await http().post(`${B}/boletos`).set(sindico()).send({ cobrancaId: 5 }).expect(409);
      expect(res.body.message).toMatch(/já tem boleto/);
    });
    it('urlPdf precisa ser uma URL', async () => {
      await http().post(`${B}/boletos`).set(sindico()).send({ cobrancaId: 5, urlPdf: 'javascript:alert(1)' }).expect(400);
    });
  });

  describe('receitas e despesas (só síndico)', () => {
    it('cria receita com status 1', async () => {
      prisma.receita.create.mockResolvedValue({ id: 1 });
      await http().post(`${B}/receitas`).set(sindico()).send({ descricao: 'Salão', valor: 200, data: '2026-11-05', categoria: 'Aluguel' }).expect(201);
      expect(prisma.receita.create.mock.calls[0][0].data).toMatchObject({ valor: 200, status: 1, categoria: 'Aluguel' });
    });
    it('despesa busca por descrição OU fornecedor', async () => {
      await http().get(`${B}/despesas?busca=elevador`).set(sindico()).expect(200);
      expect(prisma.despesa.findMany.mock.calls[0][0].where.AND).toContainEqual({
        OR: [{ descricao: { contains: 'elevador' } }, { fornecedor: { contains: 'elevador' } }],
      });
    });
    it('DELETE inativa', async () => {
      prisma.despesa.findUnique.mockResolvedValue({ id: 1 });
      prisma.despesa.update.mockResolvedValue({ id: 1, status: 0 });
      await http().delete(`${B}/despesas/1`).set(sindico()).expect(200);
      expect(prisma.despesa.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 0 } });
    });
  });

  describe('Swagger', () => {
    it('em teste (fora de produção) a página existe e explica a autenticação', async () => {
      const res = await http().get(`${B}/docs-json`).expect(200);
      expect(res.body.info.description).toContain('SWAGGER_ENABLED=true');
      expect(res.body.components.securitySchemes.bearer).toBeDefined();
      expect(Object.keys(res.body.paths)).toContain(`${B}/cobrancas`);
    });
  });
});
