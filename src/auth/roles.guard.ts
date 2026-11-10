import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from './jwt-payload';
import { ROLES_KEY } from './roles.decorator';

// Guard GLOBAL, roda depois do JwtAuthGuard. Sem @Roles a rota vale para qualquer usuário autenticado.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfis = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!perfis || perfis.length === 0) return true;
    const user = context.switchToHttp().getRequest().user as JwtPayload | undefined;
    return !!user && perfis.includes(user.usuarioPerfil);
  }
}
