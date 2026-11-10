import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy.validate', () => {
  const strategy = new JwtStrategy();

  it('aceita SINDICO e MORADOR e devolve o payload', () => {
    expect(strategy.validate({ sub: 1, usuarioId: 1, moradorId: null, usuarioPerfil: 'SINDICO' }).usuarioPerfil).toBe('SINDICO');
    const m = strategy.validate({ sub: 2, usuarioId: 2, moradorId: 7, usuarioPerfil: 'MORADOR', imovelIds: [3, 4] });
    expect(m.imovelIds).toEqual([3, 4]);
  });

  it('token sem imovelIds (emitido antes da atualização do Moradores) vira lista vazia', () => {
    expect(strategy.validate({ sub: 2, usuarioId: 2, moradorId: 7, usuarioPerfil: 'MORADOR' }).imovelIds).toEqual([]);
  });

  it('descarta valores que não são ids válidos', () => {
    const m = strategy.validate({ sub: 2, usuarioId: 2, moradorId: 7, usuarioPerfil: 'MORADOR', imovelIds: [3, -1, 0, 1.5, 'x' as any] });
    expect(m.imovelIds).toEqual([3]);
  });

  it('rejeita perfil desconhecido ou ausente', () => {
    expect(() => strategy.validate({ usuarioPerfil: 'ADMIN' } as any)).toThrow(UnauthorizedException);
    expect(() => strategy.validate({} as any)).toThrow(UnauthorizedException);
  });
});
