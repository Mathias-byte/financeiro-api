import { Prisma } from '../generated/prisma/client';
import { createPrismaMock } from '../../test/helpers/prisma-mock';
import { recalcularSituacao } from './situacao';

const D = (n: number) => new Prisma.Decimal(n);
const amanha = () => new Date(Date.now() + 36 * 3600e3);
const ontem = () => new Date(Date.now() - 48 * 3600e3);

describe('recalcularSituacao', () => {
  let tx: any;
  const cobranca = (extra: any = {}) => ({ id: 1, valor: D(500), situacao: 'PENDENTE', vencimento: amanha(), ...extra });
  const pago = (valor: number | null) => tx.pagamento.aggregate.mockResolvedValue({ _sum: { valorPago: valor === null ? null : D(valor) } });

  beforeEach(() => {
    tx = createPrismaMock();
  });

  it('vira PAGO quando os pagamentos ativos cobrem o valor', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca());
    pago(500);
    await recalcularSituacao(tx, 1);
    expect(tx.cobranca.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { situacao: 'PAGO' } });
  });

  it('pagamento maior que o valor também quita', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca());
    pago(700);
    await recalcularSituacao(tx, 1);
    expect(tx.cobranca.update).toHaveBeenCalledWith(expect.objectContaining({ data: { situacao: 'PAGO' } }));
  });

  it('pagamento parcial não quita', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca());
    pago(200);
    await recalcularSituacao(tx, 1);
    expect(tx.cobranca.update).not.toHaveBeenCalled();
  });

  it('soma apenas pagamentos ativos (status nulo ou diferente de 0)', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca());
    pago(0);
    await recalcularSituacao(tx, 1);
    expect(tx.pagamento.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cobrancaId: 1, OR: [{ status: null }, { status: { not: 0 } }] } }),
    );
  });

  it('PAGO que deixou de ser coberto volta para PENDENTE (no prazo)', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca({ situacao: 'PAGO' }));
    pago(null);
    await recalcularSituacao(tx, 1);
    expect(tx.cobranca.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { situacao: 'PENDENTE' } });
  });

  it('PAGO que deixou de ser coberto vira VENCIDO se já passou do vencimento', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca({ situacao: 'PAGO', vencimento: ontem() }));
    pago(100);
    await recalcularSituacao(tx, 1);
    expect(tx.cobranca.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { situacao: 'VENCIDO' } });
  });

  it('nunca mexe em cobrança CANCELADA', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca({ situacao: 'CANCELADO' }));
    pago(500);
    await recalcularSituacao(tx, 1);
    expect(tx.pagamento.aggregate).not.toHaveBeenCalled();
    expect(tx.cobranca.update).not.toHaveBeenCalled();
  });

  it('não grava nada quando a situação já está correta', async () => {
    tx.cobranca.findUnique.mockResolvedValue(cobranca({ situacao: 'PAGO' }));
    pago(500);
    await recalcularSituacao(tx, 1);
    expect(tx.cobranca.update).not.toHaveBeenCalled();
  });
});
