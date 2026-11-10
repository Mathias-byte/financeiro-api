import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Ex.: @Roles('SINDICO') em cima de um controller ou de uma rota.
export const Roles = (...roles: Array<'SINDICO' | 'MORADOR'>) => SetMetadata(ROLES_KEY, roles);
