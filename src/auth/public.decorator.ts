import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
// Libera uma rota (ou controller) da exigência de token. Usado só no /health.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
