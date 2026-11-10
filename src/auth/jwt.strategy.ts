import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-payload';
import { obterJwtSecret } from './jwt-secret';

// Lê "Authorization: Bearer <token>", valida assinatura e validade e injeta o payload em req.user.
//
// Diferença para o MS Moradores: aqui NÃO há consulta de usuário no banco a cada requisição (o banco
// do Financeiro não tem a tabela de usuários). Uma conta desativada ou rebaixada no Moradores continua
// valendo neste serviço até o token expirar (JWT_EXPIRES_IN, 8h por padrão).
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: obterJwtSecret(),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (payload?.usuarioPerfil !== 'SINDICO' && payload?.usuarioPerfil !== 'MORADOR') {
      throw new UnauthorizedException('Token inválido.');
    }
    const imovelIds = Array.isArray(payload.imovelIds)
      ? payload.imovelIds.filter((n) => Number.isInteger(n) && n > 0)
      : [];
    return { ...payload, imovelIds };
  }
}
