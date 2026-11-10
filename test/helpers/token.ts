import { createHmac } from 'node:crypto';

// Gera um JWT HS256 como o do MS Moradores (mesmo segredo), sem depender de biblioteca extra.
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

export function gerarToken(payload: Record<string, unknown>, opcoes: { segredo?: string; expiraEm?: number } = {}) {
  const agora = Math.floor(Date.now() / 1000);
  const corpo = { iat: agora, exp: agora + (opcoes.expiraEm ?? 3600), ...payload };
  const dados = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(corpo)}`;
  const assinatura = createHmac('sha256', opcoes.segredo ?? process.env.JWT_SECRET!).update(dados).digest('base64url');
  return `${dados}.${assinatura}`;
}
