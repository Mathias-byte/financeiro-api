// PrismaService "de mentira": cada método vira um jest.fn() que o teste configura. Roda sem MySQL.
const model = () => ({
  findUnique: jest.fn(),
  findUniqueOrThrow: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  create: jest.fn(),
  update: jest.fn(),
  aggregate: jest.fn(),
});

export function createPrismaMock() {
  const mock: any = {
    cobranca: model(),
    boleto: model(),
    pagamento: model(),
    receita: model(),
    despesa: model(),
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  mock.$transaction = jest.fn(async (arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(mock)));
  return mock;
}
