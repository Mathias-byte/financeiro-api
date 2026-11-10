// Teste de ponta a ponta contra a API REAL e o banco REAL (cria dados temporários e inativa no fim).
// NÃO rode em produção. Variáveis:
//   API_URL          (padrão http://localhost:7523/condominio/financeiro)
//   TOKEN_SINDICO    token de um SINDICO   (POST /condominio/morador/auth/login)
//   TOKEN_MORADOR    token de um MORADOR com relação ativa
//   IMOVEL_MORADOR   id do imóvel desse morador
//   IMOVEL_OUTRO     id de outro imóvel (que o morador NÃO pode ver)
import assert from 'node:assert/strict';

const base = process.env.API_URL || 'http://localhost:7523/condominio/financeiro';
const { TOKEN_SINDICO, TOKEN_MORADOR } = process.env;
const imovelMorador = Number(process.env.IMOVEL_MORADOR);
const imovelOutro = Number(process.env.IMOVEL_OUTRO);
assert(TOKEN_SINDICO && TOKEN_MORADOR && imovelMorador && imovelOutro, 'defina TOKEN_SINDICO, TOKEN_MORADOR, IMOVEL_MORADOR e IMOVEL_OUTRO');

async function req(token, method, path, body, esperado) {
  const r = await fetch(base + path, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const texto = await r.text();
  assert.equal(r.status, esperado, `${method} ${path} → ${r.status} (esperado ${esperado}): ${texto}`);
  return texto ? JSON.parse(texto) : null;
}
const S = (m, p, b, e) => req(TOKEN_SINDICO, m, p, b, e);
const M = (m, p, b, e) => req(TOKEN_MORADOR, m, p, b, e);
let passos = 0;
const ok = (nome) => console.log(`  ✔ ${++passos}. ${nome}`);

const sufixo = Date.now() % 1000;
const comp = `20${70 + (sufixo % 29)}-0${1 + (sufixo % 9)}-01`; // competência improvável de colidir

await req(null, 'GET', '/health', undefined, 200); ok('health público');
await req(null, 'GET', '/cobrancas', undefined, 401); ok('sem token → 401');

// cobranças do imóvel do morador e de outro imóvel
const minha = await S('POST', '/cobrancas', { imovelId: imovelMorador, descricao: 'Taxa teste', competencia: comp, valor: 850.5, vencimento: '2099-01-10' }, 201);
const alheia = await S('POST', '/cobrancas', { imovelId: imovelOutro, descricao: 'Taxa teste', competencia: comp, valor: 700, vencimento: '2099-01-10' }, 201);
assert.equal(minha.situacao, 'PENDENTE'); assert.equal(minha.status, 1); assert.equal(minha.valor, '850.5');
ok('síndico cria cobranças (PENDENTE, ativa, valor como texto)');
await S('POST', '/cobrancas', { imovelId: imovelMorador, competencia: comp, valor: 1, vencimento: '2099-01-10' }, 409); ok('mesma competência → 409');

// morador: escopo
const lista = await M('GET', '/cobrancas?pageSize=500', undefined, 200);
assert(lista.data.some((c) => c.id === minha.id) && !lista.data.some((c) => c.id === alheia.id));
ok('morador lista só a cobrança do seu imóvel');
await M('GET', `/cobrancas/${minha.id}`, undefined, 200);
await M('GET', `/cobrancas/${alheia.id}`, undefined, 404); ok('morador: cobrança alheia → 404');
await M('POST', '/cobrancas', { imovelId: imovelMorador, competencia: '2098-01-01', valor: 1, vencimento: '2098-01-10' }, 403); ok('morador não cria → 403');
await M('GET', '/receitas', undefined, 403); await M('GET', '/despesas', undefined, 403); ok('morador não vê receitas/despesas → 403');

// boleto
const boleto = await S('POST', '/boletos', { cobrancaId: minha.id, linhaDigitavel: `LD-${Date.now()}`, codigoBarras: 'CB-1' }, 201);
await S('POST', '/boletos', { cobrancaId: minha.id }, 409); ok('um boleto por cobrança');
const detalhe = await M('GET', `/cobrancas/${minha.id}`, undefined, 200);
assert.equal(detalhe.boleto.id, boleto.id); ok('morador vê o boleto dentro da cobrança');
await M('GET', `/boletos/${boleto.id}`, undefined, 200); ok('morador consulta o boleto do seu imóvel');

// pagamento parcial + total
const p1 = await S('POST', '/pagamentos', { cobrancaId: minha.id, valorPago: 300, dataPagamento: '2026-11-05T12:00:00.000Z', formaPagamento: 'PIX' }, 201);
assert.equal((await S('GET', `/cobrancas/${minha.id}`, undefined, 200)).situacao, 'PENDENTE'); ok('pagamento parcial mantém PENDENTE');
const p2 = await S('POST', '/pagamentos', { cobrancaId: minha.id, valorPago: 550.5, dataPagamento: '2026-11-06T12:00:00.000Z', formaPagamento: 'BOLETO' }, 201);
assert.equal((await S('GET', `/cobrancas/${minha.id}`, undefined, 200)).situacao, 'PAGO'); ok('segundo pagamento quita → PAGO');
assert.equal(p1.dataPagamento.slice(0, 10), '2026-11-05'); ok('data do pagamento volta no mesmo dia');
// cancelar p2 reabre
await S('DELETE', `/pagamentos/${p2.id}`, undefined, 200);
assert.equal((await S('GET', `/cobrancas/${minha.id}`, undefined, 200)).situacao, 'PENDENTE'); ok('cancelar pagamento reabre a cobrança');
assert.equal((await S('GET', `/pagamentos/${p2.id}`, undefined, 200)).status, 0); ok('pagamento cancelado continua consultável (status 0)');
const pagsMorador = await M('GET', '/pagamentos?pageSize=500', undefined, 200);
assert(pagsMorador.data.some((p) => p.id === p1.id)); ok('morador vê o pagamento do seu imóvel');
await S('POST', '/pagamentos', { cobrancaId: alheia.id, valorPago: 1, dataPagamento: '2026-11-05T12:00:00.000Z', formaPagamento: 'PIX' }, 201);
assert(!(await M('GET', '/pagamentos?pageSize=500', undefined, 200)).data.some((p) => p.cobrancaId === alheia.id)); ok('morador não vê pagamento de outro imóvel');

// alterar valor reavalia
await S('PATCH', `/cobrancas/${minha.id}`, { valor: 300 }, 200);
assert.equal((await S('GET', `/cobrancas/${minha.id}`, undefined, 200)).situacao, 'PAGO'); ok('reduzir o valor para o que já foi pago → PAGO');

// soft delete
const del = await S('DELETE', `/cobrancas/${alheia.id}`, undefined, 200);
assert.equal(del.status, 0);
await S('POST', '/pagamentos', { cobrancaId: alheia.id, valorPago: 1, dataPagamento: '2026-11-05T12:00:00.000Z', formaPagamento: 'PIX' }, 409); ok('cobrança inativa não recebe pagamento');
const inativas = await S('GET', '/cobrancas?status=0&pageSize=500', undefined, 200);
assert(inativas.data.some((c) => c.id === alheia.id)); ok('DELETE inativa; filtro status=0 encontra');

// receitas e despesas
const r = await S('POST', '/receitas', { descricao: 'Salão', valor: 200, data: '2026-11-05', categoria: 'Aluguel de área' }, 201);
const d = await S('POST', '/despesas', { descricao: 'Elevador', fornecedor: 'Otis', valor: 1200, data: '2026-11-05', categoria: 'Manutenção' }, 201);
assert((await S('GET', '/despesas?busca=otis', undefined, 200)).data.some((x) => x.id === d.id)); ok('busca de despesa por fornecedor');
assert((await S('GET', '/receitas?categoria=Aluguel%20de%20%C3%A1rea', undefined, 200)).data.some((x) => x.id === r.id)); ok('filtro de receita por categoria (acentos)');
await S('PATCH', `/receitas/${r.id}`, { valor: 250 }, 200);
assert.equal((await S('GET', `/receitas/${r.id}`, undefined, 200)).valor, '250');
await S('DELETE', `/receitas/${r.id}`, undefined, 200); await S('DELETE', `/despesas/${d.id}`, undefined, 200); ok('receita/despesa: editar e inativar');

// validações
await S('POST', '/cobrancas', { imovelId: 1, competencia: '2026-13-01', valor: 1, vencimento: '2026-01-10' }, 400);
await S('GET', '/cobrancas?situacao=XYZ', undefined, 400);
await S('GET', '/cobrancas/999999', undefined, 404);
ok('validações (400/404)');

// limpeza: inativa o que foi criado
await S('DELETE', `/cobrancas/${minha.id}`, undefined, 200);
await S('DELETE', `/boletos/${boleto.id}`, undefined, 200);
console.log(`\nOK — ${passos} verificações passaram.`);
