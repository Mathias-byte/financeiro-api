import { Prisma } from '../generated/prisma/client';

// Mantém cobranca_tipo coerente com os pagamentos: quando a soma dos pagamentos ATIVOS (status != 0)
// cobre o valor, a cobrança vira PAGO; se um pagamento for cancelado/reduzido e deixar de cobrir,
// volta para PENDENTE (ou VENCIDO, se já passou do vencimento). CANCELADO nunca é alterado aqui.
// Roda dentro da transação de quem alterou o pagamento.
export async function recalcularSituacao(tx: Prisma.TransactionClient, cobrancaId: number) {
  const cobranca = await tx.cobranca.findUnique({ where: { id: cobrancaId } });
  if (!cobranca || cobranca.situacao === 'CANCELADO') return;

  const soma = await tx.pagamento.aggregate({
    _sum: { valorPago: true },
    where: { cobrancaId, OR: [{ status: null }, { status: { not: 0 } }] },
  });
  const pago = soma._sum.valorPago ?? new Prisma.Decimal(0);

  let nova = cobranca.situacao;
  if (pago.gte(cobranca.valor)) {
    nova = 'PAGO';
  } else if (cobranca.situacao === 'PAGO') {
    nova = vencida(cobranca.vencimento) ? 'VENCIDO' : 'PENDENTE';
  }
  if (nova !== cobranca.situacao) {
    await tx.cobranca.update({ where: { id: cobrancaId }, data: { situacao: nova } });
  }
}

// Compara datas (AAAA-MM-DD) no fuso de Brasília, para a cobrança não "vencer" horas antes do dia seguinte.
function vencida(vencimento: Date): boolean {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return vencimento.toISOString().slice(0, 10) < hoje;
}
