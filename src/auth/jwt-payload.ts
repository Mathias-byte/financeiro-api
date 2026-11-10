// Conteúdo do token emitido pelo MS Moradores (POST /condominio/morador/auth/login).
export interface JwtPayload {
  sub: number;
  usuarioId: number;
  moradorId: number | null;
  usuarioPerfil: 'SINDICO' | 'MORADOR';
  /** imóveis com relação ativa do morador na hora do login (vazio para síndico) */
  imovelIds?: number[];
}
