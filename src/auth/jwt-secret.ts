// Segredo usado para VALIDAR os tokens emitidos pelo MS Moradores. Precisa ser exatamente o mesmo
// JWT_SECRET do Moradores (no Infisical). Sem ele a API NÃO sobe: um segredo "padrão" escrito no
// código permitiria a qualquer pessoa forjar um token de síndico.
export function obterJwtSecret(): string {
  const segredo = process.env.JWT_SECRET;
  if (!segredo) {
    throw new Error('JWT_SECRET não definida. Defina no Infisical (a mesma do MS Moradores).');
  }
  return segredo;
}
